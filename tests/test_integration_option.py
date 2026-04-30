import pytest
from fastapi.testclient import TestClient
from models.users import Teacher
from models.content import Quiz, Question, Option
from auth import create_access_token

class TestOptionIntegration:
    def setup_entities(self, session):
        teacher = Teacher(username="t_opt", email="to@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        quiz = Quiz(title="Quiz Option", description="Desc", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        question = Question(text="Q1", quiz_id=quiz.id, points=10)
        session.add(question)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        headers = {"Authorization": f"Bearer {token}"}
        return teacher, question, headers

    def test_get_options(self, client: TestClient, session):
        """
        Listado de todas las opciones.
        """
        res = client.get("/content/options")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_option_lifecycle(self, client: TestClient, session):
        """
        Creación y lectura de opciones.
        RF: RF-13 (Editar/Añadir opciones).
        Fase: Core.
        """
        teacher, question, headers = self.setup_entities(session)

        # 1. Crear opción
        payload = {"text": "Nueva opción", "is_correct": False}
        res_post = client.post(f"/content/questions/{question.id}/options", json=payload, headers=headers)
        assert res_post.status_code == 200
        opt_id = res_post.json()["id"]

        # 2. Obtener por ID
        res_get = client.get(f"/content/options/{opt_id}")
        assert res_get.status_code == 200
        assert res_get.json()["text"] == "Nueva opción"

        # 3. Borrar
        # Necesitamos cumplir restricciones: min 2 opciones y al menos una correcta restante.
        o1 = Option(text="O1 Correcta", is_correct=True, question_id=question.id)
        o2 = Option(text="O2 Correcta Extra", is_correct=True, question_id=question.id)
        session.add_all([o1, o2])
        session.commit()

        # Borrar opción incorrecta
        res_del = client.delete(f"/content/options/{opt_id}", headers=headers)
        assert res_del.status_code == 200
        assert client.get(f"/content/options/{opt_id}").status_code == 404

    def test_option_exceptions(self, client: TestClient, session):
        """
        Errores y restricciones en la gestión de opciones.
        """
        teacher, question, headers = self.setup_entities(session)
        other_teacher = Teacher(username="other_o", email="oo@o.com", hashed_password="x")
        session.add(other_teacher)
        session.commit()
        other_token = create_access_token(data={"sub": str(other_teacher.id)})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # 404
        assert client.get("/content/options/999").status_code == 404
        assert client.post("/content/questions/999/options", json={"text":"x","is_correct":True}, headers=headers).status_code == 404
        assert client.delete("/content/options/999", headers=headers).status_code == 404

        # 403 No es el propietario
        o = Option(text="Private O", is_correct=True, question_id=question.id)
        session.add(o)
        session.commit()
        assert client.post(f"/content/questions/{question.id}/options", json={"text":"x","is_correct":True}, headers=other_headers).status_code == 403
        assert client.delete(f"/content/options/{o.id}", headers=other_headers).status_code == 403

        # 400 Restricciones de borrado
        # 1. Menos de 2 opciones
        assert client.delete(f"/content/options/{o.id}", headers=headers).status_code == 400 # Solo hay 1

        o2 = Option(text="O2", is_correct=False, question_id=question.id)
        o3 = Option(text="O3", is_correct=False, question_id=question.id)
        session.add_all([o2, o3])
        session.commit()
        # 2. Intentar borrar la única correcta (ahora hay 3 opciones en total, cumpliendo la regla de >= 2)
        assert client.delete(f"/content/options/{o.id}", headers=headers).status_code == 400
