import pytest
from datetime import datetime, timezone
from models.users import Teacher, TeacherRead, Student
from schemas.content import QuizListRead
import re

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
            "email": "test@uca.es",
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
            email="lucia@uca.es",
            hashed_password="password_muy_seguro"
        )
        assert teacher.username == "lucia_user"
        assert teacher.id is None

    def test_auth_token_invalidation(self):
        """
        RF-06. Cierre de sesión
        Verificar que al recibir credenciales inválidas (como un token descartado), se lanza un error 401 que fuerza la redirección.
        """
        from fastapi import HTTPException
        from fastapi.security import HTTPAuthorizationCredentials
        from auth import get_current_teacher_id

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid_token_value")
        with pytest.raises(HTTPException) as exc_info:
            get_current_teacher_id(credentials)
        assert exc_info.value.status_code == 401
        assert "inicia sesión de nuevo" in exc_info.value.detail
