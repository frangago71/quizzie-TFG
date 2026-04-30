import pytest
from fastapi.testclient import TestClient
from models.stage import Room, Participant
from models.users import Teacher, Student
from models.content import Quiz, Question, Option

class TestParticipantIntegration:
    def setup_entities(self, session):
        # Configuración de entidades para las pruebas de participantes
        t = Teacher(username="t_part", email="tp@t.com", hashed_password="x")
        session.add(t)
        session.commit()
        q = Quiz(title="Q_Part", description="D", teacher_id=t.id)
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

    def test_participant_lifecycle(self, client: TestClient, session):
        """
        Probar el ciclo de vida de un participante: unión, verificación y estadísticas.
        RF: RF-16 (Validar PIN), RF-17 (Validar Nickname), RF-18 (Sala espera), RF-25 (Registro provisional), RF-29 (Validación Token), RF-31 (Check verificación).
        Fase: MVP / Core.
        """
        q, qu1, o1, t, s = self.setup_entities(session)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]

        # 1. Unirse
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        assert res_p.status_code == 200
        p_id = res_p.json()["participant_id"]

        # 2. Unión duplicada (permitida/idempotente o devuelve el existente)
        client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})

        # 3. Listar participantes
        res_list = client.get(f"/stage/rooms/{r_id}/participants")
        assert len(res_list.json()) >= 1

        # 4. Verificación (Pasar la sala a VERIFYING primero para generar el token)
        client.post(f"/stage/rooms/{r_id}/start")
        client.patch(f"/stage/rooms/{r_id}/next-question")

        p = session.get(Participant, p_id)
        assert p.verification_token is not None
        res_v = client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": "S1", "token": p.verification_token})
        assert res_v.status_code == 200

        # 5. Estadísticas
        res_stats = client.get(f"/stage/rooms/{r_id}/participants/{p_id}/stats")
        assert res_stats.status_code == 200

    def test_participant_exceptions(self, client: TestClient, session):
        """
        Validar el manejo de errores al gestionar participantes.
        RF: RF-17 (Validar Nickname), RF-29 (Validación Token).
        Fase: MVP / Core.
        """
        q, _, _, _, s = self.setup_entities(session)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]

        assert client.post("/stage/participants", params={"student_id": 999, "room_id": r_id}).status_code == 404
        assert client.post("/stage/participants", params={"student_id": s.id, "room_id": 999}).status_code == 404
        assert client.get("/stage/rooms/999/participants/1/stats").status_code == 404
        assert client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": "S1", "token": "x"}).status_code == 404

        client.get("/stage/participants")
