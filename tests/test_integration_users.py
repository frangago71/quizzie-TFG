import pytest
from fastapi.testclient import TestClient
from models.users import Teacher, Student
from models.content import Quiz
from models.stage import Room, RoomStatus
from auth import create_access_token, get_password_hash
from sqlmodel import select
from models.users import Teacher
from models.content import Quiz
from models.stage import Room

class TestUsersIntegration:
    # ==========================================
    # MVP
    # ==========================================

    def test_student_participation_flow(self, client: TestClient, session, monkeypatch):
        """
        HU-AL-01: Participación del estudiante (RF-17)
        Flujo de creación, verificación y listado de alumnos con sus excepciones integradas.
        """
        # Crear estudiante exitosamente (RF-17)
        nickname = "abc1234"
        res_c = client.post("/users/students", params={"nickname": nickname})
        assert res_c.status_code == 200
        assert res_c.json()["nickname"] == nickname

        # Verificar existencia del estudiante creado (RF-17)
        res_v = client.get(f"/users/students/verify/{nickname}")
        assert res_v.status_code == 200
        assert res_v.json()["exists"]

        # Listar todos los estudiantes para comprobar inclusión (RF-17)
        res_l = client.get("/users/students")
        assert res_l.status_code == 200
        assert any(s["name"] == nickname for s in res_l.json())

        # Error 400 al intentar registrar estudiante con formato inválido (RF-17)
        assert client.post("/users/students", params={"nickname": "pepe"}).status_code == 400

        # Error 400 al intentar registrar estudiante duplicado (RF-17)
        assert client.post("/users/students", params={"nickname": nickname}).status_code == 400

        # Nickname no encontrado en verificación (RF-17)
        res_v_fail = client.get("/users/students/verify/inexistente9999")
        assert not res_v_fail.json()["exists"]

        # Error 500 en creación por fallo interno de base de datos (RF-17)
        from sqlmodel import Session
        def mock_commit(self): raise Exception("DB Error")
        monkeypatch.setattr(Session, "commit", mock_commit)

        response = client.post("/users/students", params={"nickname": "err1234"})
        assert response.status_code == 500

    def test_teacher_quizzes_listing_flow(self, client: TestClient, session):
        """
        HU-PR-02: Creación manual de cuestionarios (RF-08)
        Obtención de cuestionarios creados por el docente indicando si tienen salas activas y excepciones asociadas.
        """
        # Crear docente y generar token de autenticación (RF-08)
        teacher = Teacher(username="prof_quizzes", email="pq@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Crear cuestionario asociado al docente (RF-08)
        quiz = Quiz(title="Quiz Activo", description="D", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()

        # Obtener listado de cuestionarios propios sin sala activa (RF-08)
        response_init = client.get("/users/my-quizzes", headers=headers)
        assert response_init.status_code == 200
        assert len(response_init.json()) == 1
        assert response_init.json()[0]["active_room_status"] is None
        assert response_init.json()[0]["active_room_id"] is None

        # Instanciar sala activa asociada al cuestionario (RF-08)
        room = Room(quiz_id=quiz.id, teacher_id=teacher.id, status=RoomStatus.LIVE, join_code="LIVE1")
        session.add(room)
        session.commit()

        # Obtener listado de cuestionarios detectando la sala activa (RF-08)
        response_active = client.get("/users/my-quizzes", headers=headers)
        assert response_active.status_code == 200
        data = response_active.json()
        assert len(data) == 1
        assert data[0]["active_room_status"].upper() == "LIVE"
        assert data[0]["active_room_id"] == room.id

        # Error 401 al intentar listar cuestionarios propios sin cabecera de autenticación (RF-08)
        assert client.get("/users/my-quizzes").status_code == 401

    # ==========================================
    # CORE
    # ==========================================

    def test_teacher_authentication_flow(self, client: TestClient, session):
        """
        HU-PR-01: Gestión de cuenta docente (RF-02, RF-06)
        Flujo de inicio de sesión, obtención de perfil, visualización de profesores con contraseñas enmascaradas y cierre de sesión.
        """
        # Registrar y preparar docente verificado en base de datos (RF-02)
        pwd = "password123"
        hashed = get_password_hash(pwd)
        teacher = Teacher(username="prof_login", email="login@test.com", hashed_password=hashed, is_verified=True)
        session.add(teacher)
        session.commit()

        # Obtener listado de profesores con contraseña enmascarada (RF-02)
        res_t = client.get("/users/teachers")
        assert res_t.status_code == 200
        teachers_data = res_t.json()
        assert any(t["username"] == "prof_login" for t in teachers_data)
        assert all(t["hashed_password"] == "****" for t in teachers_data)

        # Error 401 en login con correo de docente inexistente (RF-02)
        assert client.post("/users/login", json={"email": "no@existo.com", "password": "x"}).status_code == 401

        # Error 401 en login con contraseña incorrecta (RF-02)
        assert client.post("/users/login", json={"email": "login@test.com", "password": "wrong"}).status_code == 401

        # Error 403 al intentar autenticar cuenta no verificada (RF-02)
        unverified_teacher = Teacher(username="prof_unverified", email="unver@test.com", hashed_password=hashed, is_verified=False)
        session.add(unverified_teacher)
        session.commit()
        assert client.post("/users/login", json={"email": "unver@test.com", "password": pwd}).status_code == 403

        # Inicio de sesión con credenciales correctas (RF-02)
        payload = {"email": "login@test.com", "password": pwd}
        response = client.post("/users/login", json=payload)
        assert response.status_code == 200
        token = response.json()["access_token"]
        assert token is not None

        # Acceder al perfil propio con el token JWT (RF-02)
        headers = {"Authorization": f"Bearer {token}"}
        res_me = client.get("/users/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["username"] == "prof_login"
        assert res_me.json()["email"] == "login@test.com"

        # Simular el cierre de sesión descartando el token en el cliente (RF-06)
        assert client.get("/users/me").status_code == 401

    # ==========================================
    # Final Release / QA
    # ==========================================

    def test_teacher_account_qa_flow(self, client: TestClient, session):
        """
        HU-PR-01: Gestión de cuenta docente avanzada (RF-01, RF-03, RF-04, RF-05)
        Flujo integrado para la fase Final Release: registro con validación, edición de perfil,
        recuperación de contraseña con código expirado/correcto y baja del usuario con comprobación de cascada.
        """
        # 1. Registro de cuenta (RF-01)
        payload = {
            "username": "docente_qa",
            "email": "docente_qa@us.es",
            "password": "secure_password_qa"
        }
        res = client.post("/users/register", json=payload)
        assert res.status_code == 201
        assert res.json()["username"] == "docente_qa"

        # Recuperar código para verificar (RF-01)
        teacher_db = session.exec(select(Teacher).where(Teacher.email == "docente_qa@us.es")).first()
        assert teacher_db is not None

        # Verificar email (RF-01)
        res_v = client.post("/users/verify-email", json={"email": "docente_qa@us.es", "code": teacher_db.verification_code})
        assert res_v.status_code == 200
        token = res_v.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Edición de perfil (RF-05)
        res_profile = client.put("/users/me", json={"username": "qa_updated"}, headers=headers)
        assert res_profile.status_code == 200
        assert res_profile.json()["username"] == "qa_updated"

        # 3. Recuperación de contraseña (RF-04)
        client.post("/users/forgot-password", json={"email": "docente_qa@us.es"})
        session.refresh(teacher_db)
        assert teacher_db.reset_code is not None

        # Resetear contraseña (RF-04)
        res_reset = client.post("/users/reset-password", json={
            "email": "docente_qa@us.es",
            "code": teacher_db.reset_code,
            "new_password": "new_secure_password_qa"
        })
        assert res_reset.status_code == 200
        new_token = res_reset.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # 4. Creación de recursos y baja del usuario (RF-03)
        quiz = Quiz(title="Quiz QA", description="Desc QA", teacher_id=teacher_db.id)
        session.add(quiz)
        session.commit()

        # Dar de baja (RF-03)
        res_del = client.request("DELETE", "/users/me", json={"password": "new_secure_password_qa"}, headers=new_headers)
        assert res_del.status_code == 204

        # Verificar cascada (RF-03)
        assert session.get(Teacher, teacher_db.id) is None
        assert session.exec(select(Quiz).where(Quiz.id == quiz.id)).first() is None
