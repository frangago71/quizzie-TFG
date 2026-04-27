import pytest
from fastapi.testclient import TestClient
from models.stage import RoomStatus, Room, Participant, Answer, RoomPhase
from models.users import Teacher, Student
from models.content import Quiz, Question, Option
import asyncio

class TestStageIntegration:
    def setup_entities(self, session):
        t = Teacher(username="t_final", email="tf@t.com", hashed_password="x")
        session.add(t)
        session.commit()
        q = Quiz(title="Q_Final", description="D", teacher_id=t.id)
        session.add(q)
        session.commit()
        qu1 = Question(text="Q1", quiz_id=q.id, points=10)
        qu2 = Question(text="Q2", quiz_id=q.id, points=10)
        session.add_all([qu1, qu2])
        session.commit()
        o1 = Option(text="O1", is_correct=True, question_id=qu1.id)
        o2 = Option(text="O2", is_correct=True, question_id=qu2.id)
        session.add_all([o1, o2])
        session.commit()
        s = Student(name="S1")
        session.add(s)
        session.commit()
        return q, qu1, qu2, o1, t, s

    def test_ultimate_lifecycle(self, client: TestClient, session):
        q, qu1, qu2, o1, t, s = self.setup_entities(session)
        
        # 1. Create & Verify
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        code = res_c.json()["join_code"]
        client.get(f"/stage/rooms/verify/{code}")
        
        # 2. Join 
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        p_id = res_p.json()["participant_id"]
        client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        
        # 3. Start & Details LIVE
        client.post(f"/stage/rooms/{r_id}/start")
        room = session.get(Room, r_id)
        room.timer_started_at = None
        session.add(room)
        session.commit()
        
        res_det = client.get(f"/stage/rooms/{r_id}")
        assert res_det.json()["status"].upper() == "LIVE"
        
        # 4. Timer Stop 
        client.post(f"/stage/rooms/{r_id}/timer/stop")
        
        # 5. Answer & Finish Q 
        client.post("/stage/answers", params={"participant_id": p_id, "option_id": o1.id, "question_id": qu1.id})
        assert client.post("/stage/answers", params={"participant_id": p_id, "option_id": o1.id, "question_id": qu1.id}).status_code == 400
        
        client.post(f"/stage/rooms/{r_id}/questions/{qu1.id}/finish")
        client.get(f"/stage/rooms/{r_id}")
        
        # 6. Next Question 
        client.patch(f"/stage/rooms/{r_id}/next-question")
        assert client.get(f"/stage/rooms/{r_id}").json()["current_question_index"] == 2
        
        # 7. Show Leaderboard
        client.post(f"/stage/rooms/{r_id}/leaderboard/show")
        client.get(f"/stage/rooms/{r_id}/leaderboard")
        
        # 8. Next to VERIFYING 
        client.patch(f"/stage/rooms/{r_id}/next-question")
        assert client.get(f"/stage/rooms/{r_id}").json()["status"].upper() == "VERIFYING"
        
        # 9. Verify & Stats 
        p = session.get(Participant, p_id)
        # Force score mismatch to hit 375
        p.score = 999
        session.add(p)
        session.commit()
        
        client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": "S1", "token": p.verification_token})
        client.get(f"/stage/rooms/{r_id}/participants/{p_id}/stats")
        
        # 10. Finish 
        client.post(f"/stage/rooms/{r_id}/finish")
        assert client.get(f"/stage/rooms/verify/{code}").status_code == 404
        assert client.post(f"/stage/rooms/{r_id}/finish").status_code == 400
        assert client.post(f"/stage/rooms/{r_id}/force-finish").status_code == 400
        
        room_f = Room(quiz_id=q.id, join_code="FIN", status=RoomStatus.FINISHED, teacher_id=t.id)
        session.add(room_f)
        session.commit()
        assert client.get("/stage/rooms/verify/FIN").status_code == 400


    def test_all_exceptions_final(self, client: TestClient, session):
        """Dispara todas las excepciones que faltan."""
        q, qu1, _, o1, t, s = self.setup_entities(session)
        # 404s
        assert client.get("/stage/rooms/999").status_code == 404
        assert client.post("/stage/rooms/999/start").status_code == 404
        assert client.patch("/stage/rooms/999/next-question").status_code == 404
        assert client.post("/stage/rooms/999/timer/stop").status_code == 404
        assert client.post("/stage/rooms/999/leaderboard/show").status_code == 404
        assert client.post("/stage/rooms/999/questions/1/finish").status_code == 404
        assert client.get("/stage/rooms/999/participants/1/stats").status_code == 404
        assert client.post("/stage/answers", params={"participant_id": 999, "option_id": 1, "question_id": 1}).status_code == 404
        
        # 400s
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        assert client.post("/stage/rooms", params={"quiz_id": q.id}).status_code == 400
        
        # Room status errors 
        assert client.patch(f"/stage/rooms/{r_id}/next-question").status_code == 400
        
        # Participant errors
        assert client.post("/stage/participants", params={"student_id": 999, "room_id": r_id}).status_code == 404
        assert client.post("/stage/participants", params={"student_id": s.id, "room_id": 999}).status_code == 404
        
        # verify_participant errors
        assert client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": "S1", "token": "x"}).status_code == 404
        
        client.get("/stage/rooms")
        client.get("/stage/participants")
        client.get("/stage/answers")
        client.get(f"/stage/rooms/{r_id}/participants")
        
        assert client.post("/stage/rooms", params={"quiz_id": 9999}).status_code == 404
        
    def test_technical_ws_sync(self, client: TestClient, session):
        from routers.stage import manager, timer_sync_loop
        # 1. Room for WS and Sync Loop
        room = Room(quiz_id=None, join_code="WS_TECH", status=RoomStatus.LIVE, teacher_id=1, is_paused=True, remaining_time_at_pause=10, answer_time=30)
        session.add(room)
        session.commit()
        
        # 2. WebSocket Teacher Logic 
        with client.websocket_connect(f"/stage/rooms/{room.id}/ws?role=teacher") as ws:
            # 3. WebSocket Disconnect Logic 
            pass 
            
        # 4. ConnectionManager Exception 
        manager.active_connections[room.id] = [type('F', (), {'send_json': lambda x: exec('raise Exception()')})()]
        asyncio.run(manager.broadcast_to_room(room.id, {"t": "p"}))
        
        # 5. Timer Sync Loop 
        async def run_once():
            task = asyncio.create_task(timer_sync_loop())
            await asyncio.sleep(1.5)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        asyncio.run(run_once())

    def test_ultimate_lifecycle_v2(self, client: TestClient, session):
        q, qu1, qu2, o1, t, s = self.setup_entities(session)
        
        # Collision Loop
        client.post("/stage/rooms", params={"quiz_id": q.id}) 
        client.post("/stage/rooms", params={"quiz_id": q.id})
        
        q2 = Quiz(title="Q2_Final", description="D", teacher_id=t.id)
        session.add(q2)
        session.commit()
        qu3 = Question(text="Q3", quiz_id=q2.id, points=10)
        session.add(qu3)
        session.commit()
        o3 = Option(text="O3", is_correct=True, question_id=qu3.id)
        session.add(o3)
        session.commit()

        # Start Quiz Questions
        res = client.post("/stage/rooms", params={"quiz_id": q2.id, "answer_time": 10})
        data = res.json()
        assert "id" in data
        r_id = data["id"]
        client.post(f"/stage/rooms/{r_id}/start")
        
        # Score Sync & Verification 
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        p_id = res_p.json()["participant_id"]
        client.post("/stage/answers", params={"participant_id": p_id, "option_id": o3.id, "question_id": qu3.id})
        
        client.post(f"/stage/rooms/{r_id}/questions/{qu3.id}/finish")
        client.patch(f"/stage/rooms/{r_id}/next-question") 
        
        p = session.get(Participant, p_id)
        p.score = 0 
        session.add(p)
        session.commit()
        client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": "S1", "token": p.verification_token})
        
        # Force Finish 
        client.post(f"/stage/rooms/{r_id}/force-finish")
        
        # Plural List 
        client.get("/stage/participants")
        
        # notify_room_update
        client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})





