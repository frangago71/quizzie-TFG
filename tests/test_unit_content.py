import pytest
from models.content import Quiz, Question, Option

class TestContentUnitary:
    """
    Pruebas Unitarias del modelo Quiz, Question y Option para validar las reglas de negocio y restricciones.
    """

    def test_quiz_max_questions_validator(self):
        """Validar que un cuestionario no supere el límite de 30 preguntas."""
        fake_questions = [Question(text=f"Q{i}") for i in range(31)]

        with pytest.raises(ValueError, match="A quiz cannot have more than 30 questions"):
            Quiz.check_max_questions(fake_questions)

    def test_question_max_options_validator(self):
        """Validar que una pregunta no supere el límite de 8 opciones."""
        fake_options = [Option(text=f"O{i}") for i in range(9)]

        with pytest.raises(ValueError, match="A question cannot have more than 8 options"):
            Question.check_max_options(fake_options)

    def test_question_default_points(self):
        """Verificar que el valor por defecto de puntos por pregunta sea 1."""
        question = Question(text="Pregunta de prueba")
        assert question.points == 1

    def test_question_points_change(self):
        """Verificar que se puedan asignar puntos personalizados a una pregunta."""
        question = Question(text="Pregunta de prueba", points=5)
        assert question.points == 5

    def test_quiz_default_values(self):
        """Verificar los valores por defecto al crear un Quiz."""
        quiz = Quiz(title="Cuestionario Inicial", teacher_id=1)
        assert quiz.description is None
        assert quiz.image_url is None
        assert quiz.created_at is not None

    def test_option_default_is_correct(self):
        """Verificar que, por defecto, una opción no se marca como correcta."""
        option = Option(text="Respuesta falsa")
        assert option.is_correct is False

    def test_option_set_as_correct(self):
        """Verificar que se puede marcar una opción como correcta."""
        option = Option(text="Respuesta verdadera", is_correct=True)
        assert option.is_correct is True
