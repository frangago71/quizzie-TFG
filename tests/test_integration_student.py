import pytest
from fastapi.testclient import TestClient
from models.users import Student

class TestStudentIntegration:
    def test_student_lifecycle(self, client: TestClient, session):
        """
        Ciclo de creación y verificación de un estudiante.
        RF: RF-17 (Validar Nickname).
        Fase: MVP.
        """
        # 1. Crear exitoso
        nickname = "abc1234"
        res_c = client.post("/users/students", params={"nickname": nickname})
        assert res_c.status_code == 200
        assert res_c.json()["nickname"] == nickname

        # 2. Verificar existencia
        res_v = client.get(f"/users/students/verify/{nickname}")
        assert res_v.status_code == 200
        assert res_v.json()["exists"] is True

        # 3. Listar todos
        res_l = client.get("/users/students")
        assert res_l.status_code == 200
        assert any(s["name"] == nickname for s in res_l.json())

    def test_student_exceptions(self, client: TestClient, session):
        """
        Manejo de errores en estudiantes: formato, duplicados, no encontrados.
        """
        # Formato inválido
        assert client.post("/users/students", params={"nickname": "pepe"}).status_code == 400

        # Duplicado
        client.post("/users/students", params={"nickname": "xyz1234"})
        assert client.post("/users/students", params={"nickname": "xyz1234"}).status_code == 400

        # No encontrado
        res = client.get("/users/students/verify/inexistente9999")
        assert res.json()["exists"] is False

    def test_student_internal_error(self, client: TestClient, monkeypatch):
        """
        Forzar error interno (500) para cobertura del bloque except.
        """
        from sqlmodel import Session
        def mock_commit(self): raise Exception("DB Error")
        monkeypatch.setattr(Session, "commit", mock_commit)

        response = client.post("/users/students", params={"nickname": "err1234"})
        assert response.status_code == 500
