import pytest
from fastapi.testclient import TestClient
from models.users import Teacher
from models.content import Quiz, Question, Option
from models.stage import Room, RoomStatus
from auth import create_access_token

class TestQuizIntegration:
    def setup_teacher(self, session):
        teacher = Teacher(username="t_quiz", email="tq@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        return teacher, {"Authorization": f"Bearer {token}"}

    def test_get_quizzes(self, client: TestClient, session):
        """
        Listado de todos los cuestionarios.
        RF: RF-08 (Listar cuestionarios).
        Fase: MVP.
        """
        res = client.get("/content/quizzes")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_quiz_lifecycle(self, client: TestClient, session):
        """
        Probar el ciclo de vida completo de un cuestionario: creación, lectura, actualización y borrado.
        RF: RF-07 (Crear), RF-08 (Listar), RF-13 (Editar), RF-14 (Eliminar).
        Fase: MVP / Core.
        """
        teacher, headers = self.setup_teacher(session)

        # 1. Crear
        payload = {
            "title": "Quiz Test",
            "description": "Desc",
            "questions": [
                {
                    "text": "Q1",
                    "points": 10,
                    "options": [
                        {"text": "O1", "is_correct": True},
                        {"text": "O2", "is_correct": False}
                    ]
                }
            ]
        }
        res_post = client.post("/content/quizzes", json=payload, headers=headers)
        assert res_post.status_code == 201
        quiz_id = res_post.json()["quiz_id"]

        # 2. Leer
        res_get = client.get(f"/content/quizzes/{quiz_id}")
        assert res_get.status_code == 200
        assert res_get.json()["title"] == "Quiz Test"

        # 3. Actualizar
        # Probamos añadir una pregunta, borrar una opción, borrar una pregunta y cambiar textos
        update_payload = {
            "title": "Quiz Updated",
            "description": "New Desc",
            "questions": [
                {
                    "id": res_get.json()["questions"][0]["id"],
                    "text": "Q1 Updated",
                    "points": 20,
                    "options": [
                        {"id": res_get.json()["questions"][0]["options"][0]["id"], "text": "O1 Updated", "is_correct": True},
                        {"text": "O3 New", "is_correct": False}
                    ]
                },
                {
                    "text": "Q2 New",
                    "points": 5,
                    "options": [
                        {"text": "OA", "is_correct": True},
                        {"text": "OB", "is_correct": False}
                    ]
                }
            ]
        }
        # Añadimos una pregunta temporal para luego borrarla en el update
        quiz = session.get(Quiz, quiz_id)
        q_extra = Question(text="Extra", points=1, quiz_id=quiz_id)
        session.add(q_extra)
        session.commit()

        res_put = client.put(f"/content/quizzes/{quiz_id}", json=update_payload, headers=headers)
        assert res_put.status_code == 200

        res_get_v2 = client.get(f"/content/quizzes/{quiz_id}")
        assert len(res_get_v2.json()["questions"]) == 2
        # 4. Borrar conservando las salas
        res_del = client.delete(f"/content/quizzes/{quiz_id}", headers=headers)
        assert res_del.status_code == 200

        # 5. Borrar eliminando las salas
        res_c2 = client.post("/content/quizzes", json=payload, headers=headers)
        q2_id = res_c2.json()["quiz_id"]

        # Crear una sala finalizada para permitir el borrado fuerte
        room = Room(quiz_id=q2_id, teacher_id=teacher.id, status=RoomStatus.FINISHED, join_code="OLD")
        session.add(room)
        session.commit()

        res_hard = client.delete(f"/content/quizzes/{q2_id}/hard", headers=headers)
        assert res_hard.status_code == 200
        assert client.get(f"/content/quizzes/{q2_id}").status_code == 404

    def test_quiz_exceptions(self, client: TestClient, session):
        """
        Validar errores y restricciones en la gestión de cuestionarios.
        RF: RF-07, RF-13, RF-14.
        Fase: MVP / Core.
        """
        teacher, headers = self.setup_teacher(session)
        other_teacher = Teacher(username="other", email="o@o.com", hashed_password="x")
        session.add(other_teacher)
        session.commit()
        other_token = create_access_token(data={"sub": str(other_teacher.id)})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # 404 No encontrado
        valid_payload = {"title":"x", "description":"d", "questions":[{"text":"q","points":1,"options":[{"text":"o1","is_correct":True},{"text":"o2","is_correct":False}]}]}
        assert client.get("/content/quizzes/999").status_code == 404
        assert client.put("/content/quizzes/999", json=valid_payload, headers=headers).status_code == 404
        assert client.delete("/content/quizzes/999", headers=headers).status_code == 404
        assert client.delete("/content/quizzes/999/hard", headers=headers).status_code == 404

        # 400 Validación (0 preguntas)
        bad_payload = {"title": "Bad", "description":"d", "questions": []}
        assert client.put("/content/quizzes/1", json=bad_payload, headers=headers).status_code == 400

        # 403 No es el propietario
        quiz = Quiz(title="Private", description="Private Desc", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        assert client.put(f"/content/quizzes/{quiz.id}", json={"title":"x", "description":"d", "questions":[{"text":"q","points":1,"options":[{"text":"o1","is_correct":True},{"text":"o2","is_correct":False}]}]}, headers=other_headers).status_code == 403
        assert client.delete(f"/content/quizzes/{quiz.id}", headers=other_headers).status_code == 403
        assert client.delete(f"/content/quizzes/{quiz.id}/hard", headers=other_headers).status_code == 403

        # 400 Borrado incluyendo salas pero hay una sala activa
        room = Room(quiz_id=quiz.id, teacher_id=teacher.id, status=RoomStatus.WAITING, join_code="ACTIVE")
        session.add(room)
        session.commit()
        assert client.delete(f"/content/quizzes/{quiz.id}/hard", headers=headers).status_code == 400

    def test_get_quiz_rooms(self, client: TestClient, session):
        """
        Obtener las salas asociadas a un cuestionario.
        RF: RF-08.
        Fase: Core.
        """
        teacher, headers = self.setup_teacher(session)
        quiz = Quiz(title="Rooms Test", description="Desc", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()

        res = client.get(f"/content/quizzes/{quiz.id}/rooms")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

        assert client.get("/content/quizzes/999/rooms").status_code == 404
