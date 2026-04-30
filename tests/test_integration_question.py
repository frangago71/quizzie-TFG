import pytest
from fastapi.testclient import TestClient
from models.users import Teacher
from models.content import Quiz, Question, Option
from auth import create_access_token

class TestQuestionIntegration:
    def setup_entities(self, session):
        teacher = Teacher(username="t_ques", email="tqe@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        quiz = Quiz(title="Quiz Question", description="Desc", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        headers = {"Authorization": f"Bearer {token}"}
        return teacher, quiz, headers

    def test_get_questions(self, client: TestClient, session):
        """
        Listado de todas las preguntas.
        """
        res = client.get("/content/questions")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_question_lifecycle(self, client: TestClient, session):
        """
        Creación y lectura de preguntas individuales.
        RF: RF-07 (Crear), RF-13 (Editar/Añadir).
        Fase: MVP / Core.
        """
        teacher, quiz, headers = self.setup_entities(session)

        # 1. Crear pregunta
        payload = {
            "text": "¿Pregunta nueva?",
            "points": 15,
            "options": [
                {"text": "A", "is_correct": True},
                {"text": "B", "is_correct": False}
            ]
        }
        res_post = client.post(f"/content/quizzes/{quiz.id}/questions", json=payload, headers=headers)
        assert res_post.status_code == 200
        q_id = res_post.json()["id"]

        # 2. Obtener por ID
        res_get = client.get(f"/content/questions/{q_id}")
        assert res_get.status_code == 200
        assert res_get.json()["text"] == "¿Pregunta nueva?"

        # 3. Borrar
        # Necesitamos que haya al menos 2 preguntas para poder borrar una (regla de negocio line 230)
        q2 = Question(text="Q2", quiz_id=quiz.id, points=5)
        session.add(q2)
        session.commit()

        res_del = client.delete(f"/content/questions/{q_id}", headers=headers)
        assert res_del.status_code == 200
        assert client.get(f"/content/questions/{q_id}").status_code == 404

    def test_question_exceptions(self, client: TestClient, session):
        """
        Errores y validaciones en la gestión de preguntas.
        """
        teacher, quiz, headers = self.setup_entities(session)
        other_teacher = Teacher(username="other_q", email="oq@o.com", hashed_password="x")
        session.add(other_teacher)
        session.commit()
        other_token = create_access_token(data={"sub": str(other_teacher.id)})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # 404
        valid_q_payload = {"text":"x", "points":1, "options":[{"text":"o1","is_correct":True}, {"text":"o2","is_correct":False}]}
        assert client.get("/content/questions/999").status_code == 404
        assert client.post("/content/quizzes/999/questions", json=valid_q_payload, headers=headers).status_code == 404
        assert client.delete("/content/questions/999", headers=headers).status_code == 404

        # 403 No es el propietario
        q = Question(text="Private Q", quiz_id=quiz.id, points=10)
        session.add(q)
        session.commit()
        assert client.post(f"/content/quizzes/{quiz.id}/questions", json=valid_q_payload, headers=other_headers).status_code == 403
        assert client.delete(f"/content/questions/{q.id}", headers=other_headers).status_code == 403

        # 400 Borrar la última pregunta del cuestionario
        # Solo queda 'q' en el quiz
        assert client.delete(f"/content/questions/{q.id}", headers=headers).status_code == 400
