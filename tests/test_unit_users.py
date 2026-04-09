import pytest
from models.users import Teacher, TeacherRead, Student, Group
from pydantic import ValidationError
import re

class TestUsersUnit:
    """
    Tests unitarios para el dominio de Usuarios.
    """
    def test_teacher_read_masking(self):
        """Verifica que TeacherRead oculta la contraseña con asteriscos (Seguridad)."""
        teacher_data = {
            "id": 1,
            "username": "profesor_test",
            "email": "test@uca.es"
        }
        # Creamos el objeto de lectura
        teacher_read = TeacherRead(**teacher_data)
        assert teacher_read.masked_password == "****"
        assert teacher_read.model_dump(by_alias=True)["hashed_password"] == "****"

    def test_teacher_entity_creation(self):
        """Verifica la creación correcta de una entidad Teacher completa."""
        teacher = Teacher(
            username="lucia_user",
            email="lucia@uca.es",
            hashed_password="password_muy_seguro"
        )
        assert teacher.username == "lucia_user"
        assert teacher.id is None 

    def test_student_creation(self):
        """Verifica que un estudiante se crea con los valores básicos."""
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
        """Valida que los Regex de tu router aceptan formatos correctos."""
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
        """Valida que los Regex rechazan formatos incorrectos."""
        pattern_a = r"^[a-zA-Z]{3}\d{4}$"
        pattern_b = r"^[a-zA-Z]{9,12}\d{0,2}$"
        
        is_valid = re.match(pattern_a, invalid_uvus) or re.match(pattern_b, invalid_uvus)
        assert is_valid is None


    def test_group_creation_with_teacher(self):
        """Verifica la vinculación lógica de un grupo con un profesor."""
        group = Group(name="Clase A", teacher_id=1)
        assert group.name == "Clase A"
        assert group.teacher_id == 1

    def test_student_optional_group(self):
        """Verifica que un estudiante puede no tener grupo inicialmente."""
        student = Student(name="lmn5566", group_id=None)
        assert student.group_id is None