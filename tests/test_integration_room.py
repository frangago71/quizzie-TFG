import pytest
from fastapi.testclient import TestClient
from models.stage import RoomStatus, Room, RoomPhase
from models.users import Teacher, Student
from models.content import Quiz, Question, Option
import asyncio

class TestRoomIntegration:
    def setup_entities(self, session):
        # Configuración de entidades para las pruebas de sala
        t = Teacher(username="t_room", email="tr@t.com", hashed_password="x")
        session.add(t)
        session.commit()
        q = Quiz(title="Q_Room", description="D", teacher_id=t.id)
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

    def test_room_lifecycle(self, client: TestClient, session):
        """
        Probar el ciclo de vida completo de una sala.
        RF: RF-15 (Crear sala), RF-16 (Validar PIN), RF-20 (Comenzar sala), RF-21 (Distribución), RF-09 (Ranking), RF-19 (Cerrar sala). 
        Fase: MVP / Core.
        """
        q, qu1, qu2, o1, t, s = self.setup_entities(session)
        
        # 1. Crear y Verificar
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        assert res_c.status_code == 201
        r_id = res_c.json()["id"]
        code = res_c.json()["join_code"]
        assert client.get(f"/stage/rooms/verify/{code}").status_code == 200
        
        # 2. Iniciar y ver detalles LIVE
        client.post(f"/stage/rooms/{r_id}/start")
        room = session.get(Room, r_id)
        room.timer_started_at = None
        session.add(room)
        session.commit()
        
        res_det = client.get(f"/stage/rooms/{r_id}")
        assert res_det.json()["status"].upper() == "LIVE"
        
        # 3. Detener temporizador
        client.post(f"/stage/rooms/{r_id}/timer/stop")
        
        # 4. Siguiente pregunta
        client.patch(f"/stage/rooms/{r_id}/next-question")
        assert client.get(f"/stage/rooms/{r_id}").json()["current_question_index"] == 2
        
        # 5. Mostrar Leaderboard
        client.post(f"/stage/rooms/{r_id}/leaderboard/show")
        assert client.get(f"/stage/rooms/{r_id}/leaderboard").status_code == 200
        
        # 6. Pasar a fase de VERIFICACIÓN
        client.patch(f"/stage/rooms/{r_id}/next-question")
        assert client.get(f"/stage/rooms/{r_id}").json()["status"].upper() == "VERIFYING"
        
        # 7. Finalizar
        client.post(f"/stage/rooms/{r_id}/finish")
        assert client.get(f"/stage/rooms/verify/{code}").status_code == 404
        assert client.post(f"/stage/rooms/{r_id}/finish").status_code == 400
        
        # 8. Forzar finalización (incluso si ya ha terminado o como alternativa)
        r2 = client.post("/stage/rooms", params={"quiz_id": q.id}).json()
        client.post(f"/stage/rooms/{r2['id']}/force-finish")
        assert client.get(f"/stage/rooms/{r2['id']}").json()["status"].upper() == "FINISHED"

    def test_room_exceptions(self, client: TestClient, session):
        """
        Validar el manejo de errores y excepciones en la gestión de salas.
        RF: RF-15 (Crear sala), RF-16 (Validar PIN), RF-20 (Comenzar sala). 
        Fase: MVP / Core.
        """
        q, qu1, _, o1, t, s = self.setup_entities(session)
        # Errores 404
        assert client.get("/stage/rooms/999").status_code == 404
        assert client.post("/stage/rooms/999/start").status_code == 404
        assert client.patch("/stage/rooms/999/next-question").status_code == 404
        assert client.post("/stage/rooms/999/timer/stop").status_code == 404
        assert client.post("/stage/rooms/999/leaderboard/show").status_code == 404
        assert client.post("/stage/rooms", params={"quiz_id": 9999}).status_code == 404
        
        # Errores 400
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        assert client.post("/stage/rooms", params={"quiz_id": q.id}).status_code == 400
        assert client.patch(f"/stage/rooms/{r_id}/next-question").status_code == 400

    def test_technical_ws_sync(self, client: TestClient, session):
        """
        Verificar la sincronización técnica mediante WebSockets y el bucle del temporizador.
        RF: RF-22 (Temporizador servidor), RF-21 (Distribución), RF-40 (Gestión desconexiones). 
        Fase: Core.
        """
        from routers.stage import manager, timer_sync_loop
        # 1. Sala para lógica de WS y bucle de sincronización
        room = Room(quiz_id=None, join_code="WS_TECH", status=RoomStatus.LIVE, teacher_id=1, is_paused=True, remaining_time_at_pause=10, answer_time=30)
        session.add(room)
        session.commit()
        
        # 2. Lógica de WebSocket para el profesor
        with client.websocket_connect(f"/stage/rooms/{room.id}/ws?role=teacher") as ws:
            pass 
            
        # 3. Excepción en el ConnectionManager
        manager.active_connections[room.id] = [type('F', (), {'send_json': lambda x: exec('raise Exception()')})()]
        asyncio.run(manager.broadcast_to_room(room.id, {"t": "p"}))
        
        # 4. Bucle de sincronización del temporizador
        async def run_once():
            task = asyncio.create_task(timer_sync_loop())
            await asyncio.sleep(1.5)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        asyncio.run(run_once())
