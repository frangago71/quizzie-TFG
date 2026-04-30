import pytest
from fastapi.testclient import TestClient
from models.users import Teacher
from models.content import Quiz
from models.stage import Room, RoomStatus
from auth import create_access_token, get_password_hash

class TestTeacherIntegration:
    def test_login_success(self, client: TestClient, session):
        """
        Inicio de sesión exitoso.
        RF: RF-02 (Inicio de sesión).
        Fase: Core.
        """
        pwd = "password123"
        hashed = get_password_hash(pwd)
        teacher = Teacher(username="prof_login", email="login@test.com", hashed_password=hashed)
        session.add(teacher)
        session.commit()

        payload = {"email": "login@test.com", "password": pwd}
        response = client.post("/users/login", json=payload)
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login_fail(self, client: TestClient, session):
        """
        Fallo en el inicio de sesión (credenciales incorrectas).
        RF: RF-02.
        Fase: Core.
        """
        # Usuario no existe
        assert client.post("/users/login", json={"email": "no@existo.com", "password": "x"}).status_code == 401

        # Contraseña incorrecta
        teacher = Teacher(username="prof_fail", email="fail@test.com", hashed_password=get_password_hash("real"))
        session.add(teacher)
        session.commit()
        assert client.post("/users/login", json={"email": "fail@test.com", "password": "wrong"}).status_code == 401

    def test_get_teachers(self, client: TestClient, session):
        """
        Obtener listado de profesores con contraseña enmascarada.
        """
        teacher = Teacher(username="masked", email="m@t.com", hashed_password="secret_hash")
        session.add(teacher)
        session.commit()

        res = client.get("/users/teachers")
        assert res.status_code == 200
        data = res.json()
        assert any(t["username"] == "masked" for t in data)
        assert all(t["hashed_password"] == "****" for t in data)

    def test_get_my_quizzes_with_active_room(self, client: TestClient, session):
        """
        Listar cuestionarios del profesor detectando si hay una sala activa.
        RF: RF-08 (Listar cuestionarios).
        Fase: Core.
        """
        teacher = Teacher(username="prof_quizzes", email="pq@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        headers = {"Authorization": f"Bearer {token}"}

        quiz = Quiz(title="Quiz Activo", description="D", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()

        # Sala activa
        room = Room(quiz_id=quiz.id, teacher_id=teacher.id, status=RoomStatus.LIVE, join_code="LIVE1")
        session.add(room)
        session.commit()

        response = client.get("/users/my-quizzes", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["active_room_status"].upper() == "LIVE"
        assert data[0]["active_room_id"] == room.id
