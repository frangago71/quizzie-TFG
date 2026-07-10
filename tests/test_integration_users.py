import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlmodel import select, Session
from models.users import Teacher, Student
from models.content import Quiz
from models.stage import Room, RoomStatus
from auth import create_access_token, get_password_hash

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

        # Obtener listado de grupos (RF-08)
        assert client.get("/users/groups").status_code == 200

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

        # Excepción: Acceder al perfil con un token de usuario inexistente (RF-02)
        token_invalid = create_access_token(data={"sub": "99999"})
        assert client.get("/users/me", headers={"Authorization": f"Bearer {token_invalid}"}).status_code == 404

        # Excepción: Acceder al perfil con un token de usuario no verificado (RF-02)
        token_unver = create_access_token(data={"sub": str(unverified_teacher.id)})
        assert client.get("/users/me", headers={"Authorization": f"Bearer {token_unver}"}).status_code == 403

        # Simular el cierre de sesión descartando el token en el cliente (RF-06)
        assert client.get("/users/me").status_code == 401

    # ==========================================
    # Final Release / QA
    # ==========================================

    def test_teacher_account_qa_flow(self, client: TestClient, session, monkeypatch):
        """
        HU-PR-01: Gestión de cuenta docente avanzada (RF-01, RF-03, RF-04, RF-05)
        Flujo integrado para la fase Final Release: registro con validación, edición de perfil,
        recuperación de contraseña con código expirado/correcto y baja del usuario con comprobación de cascada.
        """
        # Registro de cuenta (RF-01)
        payload = {
            "username": "docente_qa",
            "email": "docente_qa@us.es",
            "password": "secure_password_qa"
        }
        res = client.post("/users/register", json=payload)
        assert res.status_code == 201
        assert res.json()["username"] == "docente_qa"

        # Excepciones en registro (RF-01):
        # Intentar registrar con un email ya registrado -> raises 400
        payload_dup_email = {
            "username": "otro_docente",
            "email": "docente_qa@us.es",
            "password": "secure_password_qa"
        }
        assert client.post("/users/register", json=payload_dup_email).status_code == 400

        # Intentar registrar con un username ya registrado -> raises 400
        payload_dup_user = {
            "username": "docente_qa",
            "email": "otro_docente@us.es",
            "password": "secure_password_qa"
        }
        assert client.post("/users/register", json=payload_dup_user).status_code == 400

        # Fallo de base de datos en registro -> raises 500
        def mock_commit(self): raise Exception("DB Error")
        monkeypatch.setattr(Session, "commit", mock_commit)
        payload_err = {
            "username": "error_docente",
            "email": "error_docente@us.es",
            "password": "secure_password_qa"
        }
        assert client.post("/users/register", json=payload_err).status_code == 500
        monkeypatch.undo()

        # Recuperar código para verificar (RF-01)
        teacher_db = session.exec(select(Teacher).where(Teacher.email == "docente_qa@us.es")).first()
        assert teacher_db is not None

        # Excepciones en verificación de email (RF-01):
        # Usuario no encontrado -> raises 404
        assert client.post("/users/verify-email", json={"email": "noexisto@us.es", "code": "123456"}).status_code == 404

        # Código de verificación incorrecto -> raises 400
        assert client.post("/users/verify-email", json={"email": "docente_qa@us.es", "code": "000000"}).status_code == 400

        # Código de verificación expirado -> raises 400
        past_time = datetime.now(timezone.utc) - timedelta(hours=1)
        teacher_db.verification_code_expires_at = past_time
        session.add(teacher_db)
        session.commit()
        assert client.post("/users/verify-email", json={"email": "docente_qa@us.es", "code": teacher_db.verification_code}).status_code == 400

        # Reenvío de código: Usuario no encontrado -> raises 404
        assert client.post("/users/resend-verification", json={"email": "noexisto@us.es"}).status_code == 404

        # Reenvío de código: Éxito (restablecer fecha de expiración para verificar)
        res_resend = client.post("/users/resend-verification", json={"email": "docente_qa@us.es"})
        assert res_resend.status_code == 200
        assert res_resend.json()["message"] == "Nuevo código enviado."
        session.refresh(teacher_db)

        # Verificar email (RF-01)
        res_v = client.post("/users/verify-email", json={"email": "docente_qa@us.es", "code": teacher_db.verification_code})
        assert res_v.status_code == 200
        token = res_v.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Reenvío de código después de verificar: Cuenta ya verificada -> returns 200
        res_resend_already = client.post("/users/resend-verification", json={"email": "docente_qa@us.es"})
        assert res_resend_already.status_code == 200
        assert res_resend_already.json()["message"] == "La cuenta ya está verificada."

        # Verificar de nuevo: Cuenta ya verificada -> returns 200
        res_v_already = client.post("/users/verify-email", json={"email": "docente_qa@us.es", "code": "123456"})
        assert res_v_already.status_code == 200
        assert res_v_already.json()["message"] == "La cuenta ya está verificada."

        # Edición de perfil (RF-05)
        res_profile = client.put("/users/me", json={"username": "qa_updated"}, headers=headers)
        assert res_profile.status_code == 200
        assert res_profile.json()["username"] == "qa_updated"

        # Excepciones en edición de perfil (RF-05):
        # Usuario no encontrado -> raises 404
        token_invalid = create_access_token(data={"sub": "99999"})
        assert client.put("/users/me", json={"username": "qa_updated"}, headers={"Authorization": f"Bearer {token_invalid}"}).status_code == 404

        # Nombre de usuario ya registrado -> raises 400
        other_teacher = Teacher(username="colision_username", email="colision@us.es", hashed_password="x", is_verified=True)
        session.add(other_teacher)
        session.commit()
        assert client.put("/users/me", json={"username": "colision_username"}, headers=headers).status_code == 400

        # Usuario no verificado -> raises 403 (creamos un usuario no verificado temporal para testear el error)
        unverified_temp = Teacher(username="temp_unv", email="temp_unv@us.es", hashed_password="x", is_verified=False)
        session.add(unverified_temp)
        session.commit()
        token_temp = create_access_token(data={"sub": str(unverified_temp.id)})
        assert client.put("/users/me", json={"username": "temp_updated"}, headers={"Authorization": f"Bearer {token_temp}"}).status_code == 403
        assert client.get("/users/me", headers={"Authorization": f"Bearer {token_temp}"}).status_code == 403

        # Recuperación de contraseña (RF-04)
        client.post("/users/forgot-password", json={"email": "docente_qa@us.es"})
        session.refresh(teacher_db)
        assert teacher_db.reset_code is not None

        # Excepciones en recuperación de contraseña (RF-04):
        # Solicitar recuperación para email no existente -> raises 404
        assert client.post("/users/forgot-password", json={"email": "nonexistent@us.es"}).status_code == 404

        # Resetear contraseña de usuario no existente -> raises 404
        assert client.post("/users/reset-password", json={"email": "nonexistent@us.es", "code": "123456", "new_password": "newpassword123"}).status_code == 404

        # Resetear contraseña con código incorrecto -> raises 400
        assert client.post("/users/reset-password", json={"email": "docente_qa@us.es", "code": "000000", "new_password": "newpassword123"}).status_code == 400

        # Resetear contraseña con código expirado -> raises 400
        past_time = datetime.now(timezone.utc) - timedelta(minutes=1)
        teacher_db.reset_code_expires_at = past_time
        session.add(teacher_db)
        session.commit()
        assert client.post("/users/reset-password", json={"email": "docente_qa@us.es", "code": teacher_db.reset_code, "new_password": "newpassword123"}).status_code == 400

        # Regenerar código de recuperación válido para poder continuar con el flujo normal
        client.post("/users/forgot-password", json={"email": "docente_qa@us.es"})
        session.refresh(teacher_db)

        # Resetear contraseña (RF-04)
        res_reset = client.post("/users/reset-password", json={
            "email": "docente_qa@us.es",
            "code": teacher_db.reset_code,
            "new_password": "new_secure_password_qa"
        })
        assert res_reset.status_code == 200
        new_token = res_reset.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # Creación de recursos y baja del usuario (RF-03)
        quiz = Quiz(title="Quiz QA", description="Desc QA", teacher_id=teacher_db.id)
        session.add(quiz)
        session.commit()
        quiz_id = quiz.id

        # Excepciones en baja del usuario (RF-03):
        # Usuario no encontrado en baja -> raises 404
        assert client.request("DELETE", "/users/me", json={"password": "new_secure_password_qa"}, headers={"Authorization": f"Bearer {token_invalid}"}).status_code == 404

        # Contraseña incorrecta en baja -> raises 400
        assert client.request("DELETE", "/users/me", json={"password": "wrong_password"}, headers=new_headers).status_code == 400

        # Error en base de datos en baja -> raises 500
        def mock_delete(self, instance): raise Exception("DB Delete Error")
        monkeypatch.setattr(Session, "delete", mock_delete)
        assert client.request("DELETE", "/users/me", json={"password": "new_secure_password_qa"}, headers=new_headers).status_code == 500
        monkeypatch.undo()

        # Dar de baja (RF-03)
        res_del = client.request("DELETE", "/users/me", json={"password": "new_secure_password_qa"}, headers=new_headers)
        assert res_del.status_code == 204

        # Verificar cascada (RF-03)
        assert session.get(Teacher, teacher_db.id) is None
        assert session.exec(select(Quiz).where(Quiz.id == quiz_id)).first() is None
