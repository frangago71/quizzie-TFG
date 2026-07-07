import pytest
import re
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from models.users import Teacher, TeacherRead, Student
from schemas.content import QuizListRead
from schemas.users import TeacherCreate, ResetPasswordRequest, ProfileUpdateRequest
from auth import get_current_teacher_id, get_password_hash, verify_password

class TestUsersUnit:
    """
    Tests unitarios para el dominio de Usuarios.
    """

    # ==========================================
    # MVP
    # ==========================================

    def test_student_creation(self):
        """
        RF-17. Validar Nickname
        Verificar que un estudiante se crea con los valores básicos.
        """
        student = Student(name="abc1234")
        assert student.name == "abc1234"
        assert student.group_id is None

    @pytest.mark.parametrize("uvus", [
        "abc1234",       # Patrón A: 3 letras + 4 números
        "xyz9876",       # Patrón A
        "garciaperez01", # Patrón B: Nombre/Apellidos largo
        "fernandez1",    # Patrón B
    ])
    def test_valid_uvus_regex(self, uvus):
        """
        RF-17. Validar Nickname
        Valida que se aceptan formatos correctos de UVUS/nickname.
        """
        pattern_a = r"^[a-zA-Z]{3}\d{4}$"
        pattern_b = r"^[a-zA-Z]{9,12}\d{0,2}$"

        is_valid = re.match(pattern_a, uvus) or re.match(pattern_b, uvus)
        assert is_valid is not None

    @pytest.mark.parametrize("invalid_uvus", [
        "ab1234",      # 2 letras en vez de 3
        "abcd1234",    # 4 letras en vez de 3
        "abc12345",    # 5 números en vez de 4
        "curro",       # Solo letras, demasiado corto para patrón B
    ])
    def test_invalid_uvus_regex(self, invalid_uvus):
        """
        RF-17. Validar Nickname
        Valida que los Regex rechazan formatos incorrectos de UVUS/nickname.
        """
        pattern_a = r"^[a-zA-Z]{3}\d{4}$"
        pattern_b = r"^[a-zA-Z]{9,12}\d{0,2}$"

        is_valid = re.match(pattern_a, invalid_uvus) or re.match(pattern_b, invalid_uvus)
        assert is_valid is None

    def test_quiz_list_read_schema(self):
        """
        RF-08. Listar cuestionarios
        Verificar la correcta instanciación y validación del esquema de lectura de cuestionarios.
        """
        data = {
            "id": 1,
            "title": "Cuestionario de prueba",
            "description": "Una descripción",
            "created_at": datetime.now(timezone.utc),
            "active_room_id": 12,
            "active_room_status": "LIVE"
        }
        schema = QuizListRead(**data)
        assert schema.id == 1
        assert schema.active_room_status == "LIVE"

    # ==========================================
    # CORE
    # ==========================================

    def test_teacher_read_masking(self):
        """
        RF-02. Inicio de sesión
        Verifica que TeacherRead oculta la contraseña con asteriscos (RNF-04. Privacidad).
        """
        teacher_data = {
            "id": 1,
            "username": "profesor_test",
            "email": "test@us.es",
            "is_verified": False
        }
        teacher_read = TeacherRead(**teacher_data)
        assert teacher_read.masked_password == "****"
        assert teacher_read.model_dump(by_alias=True)["hashed_password"] == "****"

    def test_teacher_entity_creation(self):
        """
        RF-02. Inicio de sesión
        Verifica la creación correcta de una entidad Teacher completa.
        """
        teacher = Teacher(
            username="lucia_user",
            email="lucia@us.es",
            hashed_password="password_muy_seguro"
        )
        assert teacher.username == "lucia_user"
        assert teacher.id is None

    def test_auth_token_invalidation(self):
        """
        RF-06. Cierre de sesión
        Verificar que al recibir credenciales inválidas (como un token descartado), se lanza un error 401 que fuerza la redirección.
        """
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid_token_value")
        with pytest.raises(HTTPException) as exc_info:
            get_current_teacher_id(credentials)
        assert exc_info.value.status_code == 401
        assert "inicia sesión de nuevo" in exc_info.value.detail

    # ==========================================
    # Final Release / QA
    # ==========================================

    def test_teacher_registration_validation(self):
        """
        RF-01. Gestión de registro
        Verificar la validación de campos del docente al registrarse y el hashing seguro de la contraseña.
        """
        # Validaciones de email, username y password (RF-01)
        with pytest.raises(ValidationError):
            TeacherCreate(username="TeacherValid", email="invalid-email", password="password123")

        with pytest.raises(ValidationError):
            TeacherCreate(username="TeacherValid", email="test@us.es", password="123")

        with pytest.raises(ValidationError):
            TeacherCreate(username="Te", email="test@us.es", password="password123")

        # Hashing de contraseña seguro (RF-01)
        raw_password = "SecurePassword123"
        hashed = get_password_hash(raw_password)
        assert hashed != raw_password
        assert verify_password(raw_password, hashed)
        assert not verify_password("wrong_password", hashed)

    def test_teacher_cascade_delete_relationship(self):
        """
        RF-03. Baja de usuarios
        Validar que las relaciones de cascada estén configuradas para borrar quizzes, grupos y salas del docente.
        """
        # Relaciones en cascada del Docente (RF-03)
        teacher_relation_quizzes = Teacher.__sqlmodel_relationships__["quizzes"]
        assert "delete-orphan" in teacher_relation_quizzes.sa_relationship_kwargs.get("cascade", "")

        teacher_relation_groups = Teacher.__sqlmodel_relationships__["groups"]
        assert "delete-orphan" in teacher_relation_groups.sa_relationship_kwargs.get("cascade", "")

        teacher_relation_rooms = Teacher.__sqlmodel_relationships__["rooms"]
        assert "delete-orphan" in teacher_relation_rooms.sa_relationship_kwargs.get("cascade", "")

    def test_teacher_password_reset_validation(self):
        """
        RF-04. Recuperación contraseña
        Verificar que el esquema ResetPasswordRequest valida los campos y que la entidad almacena y expira el código.
        """
        # Validación del esquema ResetPasswordRequest (RF-04)
        req = ResetPasswordRequest(email="test@us.es", code="123456", new_password="newsecurepassword")
        assert req.new_password == "newsecurepassword"

        with pytest.raises(ValidationError):
            ResetPasswordRequest(email="test@us.es", code="123456", new_password="123")

        with pytest.raises(ValidationError):
            ResetPasswordRequest(email="invalid-email", code="123456", new_password="newsecurepassword")

        # Atributos de expiración de código (RF-04)
        now = datetime.now(timezone.utc)
        teacher = Teacher(
            username="teacher_reset",
            email="reset@us.es",
            hashed_password="x",
            reset_code="999999",
            reset_code_expires_at=now + timedelta(minutes=15)
        )
        assert teacher.reset_code == "999999"
        assert teacher.reset_code_expires_at > now

    def test_teacher_profile_update_validation(self):
        """
        RF-05. Edición perfil
        Verificar que el esquema ProfileUpdateRequest valida la longitud correcta del nombre de usuario.
        """
        # Username válido (RF-05)
        req = ProfileUpdateRequest(username="New Username")
        assert req.username == "New Username"

        # Username demasiado corto (RF-05)
        with pytest.raises(ValidationError):
            ProfileUpdateRequest(username="Ab")

        # Username demasiado largo (RF-05)
        with pytest.raises(ValidationError):
            ProfileUpdateRequest(username="a" * 51)
