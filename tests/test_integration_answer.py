import pytest
from fastapi.testclient import TestClient
from models.stage import Room, Participant, Answer
from models.users import Teacher, Student
from models.content import Quiz, Question, Option

class TestAnswerIntegration:
    def setup_entities(self, session):
        # Configuración de entidades para las pruebas de respuestas
        t = Teacher(username="t_ans", email="ta@t.com", hashed_password="x")
        session.add(t)
        session.commit()
        q = Quiz(title="Q_Ans", description="D", teacher_id=t.id)
        session.add(q)
        session.commit()
        qu1 = Question(text="Q1", quiz_id=q.id, points=10)
        session.add(qu1)
        session.commit()
        o1 = Option(text="O1", is_correct=True, question_id=qu1.id)
        session.add(o1)
        session.commit()
        s = Student(name="S1")
        session.add(s)
        session.commit()
        return q, qu1, o1, t, s

    def test_answer_lifecycle(self, client: TestClient, session):
        """
        Probar el envío de respuestas y las restricciones de duplicidad.
        RF: RF-23 (Recepción respuestas), RF-24 (Feedback inmediato), RF-22 (Temporizador servidor).
        Fase: MVP / Core.
        """
        q, qu1, o1, t, s = self.setup_entities(session)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        p_id = res_p.json()["participant_id"]
        
        # 1. Iniciar Sala (Solo se permite responder si la sala está LIVE)
        client.post(f"/stage/rooms/{r_id}/start")
        
        # 2. Enviar Respuesta
        res_a = client.post("/stage/answers", params={"participant_id": p_id, "option_id": o1.id, "question_id": qu1.id})
        assert res_a.status_code == 201
        
        # 3. Error al enviar respuesta duplicada
        res_a2 = client.post("/stage/answers", params={"participant_id": p_id, "option_id": o1.id, "question_id": qu1.id})
        assert res_a2.status_code == 400

    def test_answer_exceptions(self, client: TestClient, session):
        """
        Validar el manejo de errores al enviar respuestas.
        RF: RF-23 (Recepción respuestas).
        Fase: MVP.
        """
        assert client.post("/stage/answers", params={"participant_id": 999, "option_id": 1, "question_id": 1}).status_code == 404
        client.get("/stage/answers")
