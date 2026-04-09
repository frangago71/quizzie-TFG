import pytest
from fastapi.testclient import TestClient
from models.users import Teacher, Student

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
        """Verificar la obtención de quizzes para el profesor por defecto (ID 1)."""
        teacher = Teacher(id=1, username="admin", email="admin@test.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        
        response = client.get("/users/1/quizzes/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)