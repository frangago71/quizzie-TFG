import pytest
from fastapi.testclient import TestClient
from models.users import Teacher, Student, Group
from auth import create_access_token

class TestUsersIntegration:
    """
    Tests de integración para el dominio Users.
    """

    def test_create_student_success(self, client: TestClient, session):
        """Crear un estudiante con formato UVUS válido."""
        response = client.post("/users/students", params={"nickname": "abc1234"})
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["nickname"] == "abc1234"

    def test_create_student_invalid_format(self, client: TestClient):
        """Rechazar formato de nickname incorrecto."""
        response = client.post("/users/students", params={"nickname": "pepe123"})
        assert response.status_code == 400
        assert "Formato de uvus incorrecto" in response.json()["detail"]

    def test_create_student_duplicate(self, client: TestClient, session):
        """Validar que no se permiten nicknames duplicados."""
        # Creamos el primero
        client.post("/users/students", params={"nickname": "xyz9876"})
        # Intentamos el mismo
        response = client.post("/users/students", params={"nickname": "xyz9876"})
        assert response.status_code == 400
        assert "ya está registrado" in response.json()["detail"]

    def test_verify_student_exists(self, client: TestClient, session):
        """Escenario 5: Verificar si un nickname existe (Case Insensitive)."""
        client.post("/users/students", params={"nickname": "abc1234"})
        
        # Probamos búsqueda en minúsculas para ver si el func.lower() funciona
        response = client.get("/users/students/verify/abc1234")
        assert response.status_code == 200
        assert response.json()["exists"] is True
        assert response.json()["nickname"] == "abc1234"

    def test_get_teachers_masked(self, client: TestClient, session):
        """Verificar que la API devuelve profes con password enmascarada."""
        teacher = Teacher(
            username="lucia_dev", 
            email="lucia@test.com", 
            hashed_password="secret_hash_123"
        )
        session.add(teacher)
        session.commit()

        response = client.get("/users/teachers")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        # El campo debe venir como "hashed_password" (por el alias) pero con valor "****"
        assert data[0]["hashed_password"] == "****"
        assert "secret_hash_123" not in str(response.content)

    def test_get_teacher_quizzes_default(self, client: TestClient, session):
        teacher_id = 1
        teacher = Teacher(id=teacher_id, username="admin", email="admin@test.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        token = create_access_token(data={"sub": str(teacher_id)})
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/users/my-quizzes", headers=headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_groups_and_students_lists(self, client: TestClient, session):
        """Cobertura de listados generales de grupos y estudiantes."""
        session.add(Teacher(id=10, username="t_groups", email="g@t.com", hashed_password="x"))
        session.add(Group(name="Grupo Test", teacher_id=10))
        session.commit()
        
        res_groups = client.get("/users/groups")
        assert res_groups.status_code == 200
        assert len(res_groups.json()) >= 1

        res_students = client.get("/users/students")
        assert res_students.status_code == 200
        assert isinstance(res_students.json(), list)

    def test_verify_student_not_found(self, client: TestClient, session):
        """Cobertura de nickname no encontrado."""
        response = client.get("/users/students/verify/inexistente1234")
        assert response.status_code == 200
        assert response.json()["exists"] is False
        assert "no encontrado" in response.json()["message"]

    def test_create_student_internal_error(self, client: TestClient, monkeypatch):
        """Cobertura del bloque except (Error 500)."""
        # Forzamos un error en la sesión para que salte al bloque 'except' 
        from sqlmodel import Session
        def mock_commit(self):
            raise Exception("DB Error")
        
        monkeypatch.setattr(Session, "commit", mock_commit)

        response = client.post("/users/students", params={"nickname": "err1234"})
        assert response.status_code == 500
        assert "Error interno" in response.json()["detail"]