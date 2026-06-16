import pytest
from datetime import datetime, timedelta, timezone
from models.content import Quiz, Question, Option

class TestContentUnitary:
    """
    Pruebas unitarias del módulo Contenido (Quiz, Question y Option).
    """

    # ==========================================
    # MVP
    # ==========================================

    def test_quiz_creation_defaults(self):
        """
        RF-07. Crear cuestionario
        Verificar los valores por defecto al instanciar un Quiz.
        """
        quiz = Quiz(title="Cuestionario Inicial", teacher_id=1, description="Cuestionario de prueba")
        assert quiz.description == "Cuestionario de prueba"
        assert quiz.image_url is None
        assert quiz.created_at is not None

    def test_question_default_points(self):
        """
        RF-07. Crear cuestionario
        Verificar que el valor por defecto de puntos por pregunta sea 1.
        """
        question = Question(text="Pregunta de prueba", quiz_id=1)
        assert question.points == 1

    def test_option_default_is_correct(self):
        """
        RF-07. Crear cuestionario
        Verificar que, por defecto, una opción no se marca como correcta.
        """
        option = Option(text="Respuesta falsa", question_id=1)
        assert not option.is_correct

    def test_option_set_as_correct(self):
        """
        RF-07. Crear cuestionario
        Verificar que se puede marcar una opción como correcta.
        """
        option = Option(text="Respuesta verdadera", is_correct=True, question_id=1)
        assert option.is_correct

    def test_quiz_list_relationship(self):
        """
        RF-08. Listar cuestionarios
        Verificar la relación y estructura de asociación para listar cuestionarios del profesor.
        """
        quiz1 = Quiz(id=1, title="Quiz 1", teacher_id=1, description="Desc 1")
        quiz2 = Quiz(id=2, title="Quiz 2", teacher_id=1, description="Desc 2")
        quizzes = [quiz1, quiz2]
        assert len(quizzes) == 2
        assert quizzes[0].teacher_id == 1
        assert quizzes[1].teacher_id == 1

    def test_quiz_question_distribution_sequence(self):
        """
        RF-21. Distribución
        Verificar la capacidad de obtener preguntas secuencialmente de un cuestionario para su distribución.
        """
        quiz = Quiz(title="Q", teacher_id=1, description="D")
        q1 = Question(text="Q1", quiz=quiz)
        q2 = Question(text="Q2", quiz=quiz)
        distributed = [q1, q2]
        assert distributed[0].text == "Q1"
        assert distributed[1].text == "Q2"

    def test_question_correct_option_check(self):
        """
        RF-23. Recepción respuestas
        Validar la identificación de la opción correcta de una pregunta al recibir una respuesta.
        """
        question = Question(text="Pregunta", quiz_id=1)
        opt1 = Option(text="Incorrecta", is_correct=False, question=question)
        opt2 = Option(text="Correcta", is_correct=True, question=question)

        correct_opts = [o for o in [opt1, opt2] if o.is_correct]
        assert len(correct_opts) == 1
        assert correct_opts[0].text == "Correcta"

    # ==========================================
    # CORE
    # ==========================================

    def test_quiz_max_questions_validator(self):
        """
        RF-13. Edición de cuestionarios y preguntas
        Validar que un cuestionario no supere el límite de 30 preguntas.
        """
        fake_questions = [Question(text=f"Q{i}", quiz_id=1) for i in range(31)]

        with pytest.raises(ValueError, match="A quiz cannot have more than 30 questions"):
            Quiz.check_max_questions(fake_questions)

    def test_question_max_options_validator(self):
        """
        RF-13. Edición de cuestionarios y preguntas
        Validar que una pregunta no supere el límite de 8 opciones.
        """
        fake_options = [Option(text=f"O{i}", question_id=1) for i in range(9)]

        with pytest.raises(ValueError, match="A question cannot have more than 8 options"):
            Question.check_max_options(fake_options)

    def test_question_points_change(self):
        """
        RF-13. Edición de cuestionarios y preguntas
        Verificar que se puedan asignar puntos personalizados a una pregunta durante su edición.
        """
        question = Question(text="Pregunta de prueba", quiz_id=1)
        question.points = 5
        assert question.points == 5

    def test_quiz_editing_fields(self):
        """
        RF-13. Edición de cuestionarios y preguntas
        Verificar la modificación de campos del Quiz (título, descripción).
        """
        quiz = Quiz(title="Título Inicial", teacher_id=1, description="Desc inicial")
        quiz.title = "Título Editado"
        quiz.description = "Desc Editada"
        assert quiz.title == "Título Editado"
        assert quiz.description == "Desc Editada"

    def test_quiz_cascade_delete_relationship(self):
        """
        RF-14. Eliminación de datos
        Validar que las relaciones de cascada estén configuradas para borrar preguntas huérfanas al eliminar un cuestionario.
        """
        quiz_relation = Quiz.__sqlmodel_relationships__["questions"]
        assert "delete-orphan" in quiz_relation.sa_relationship_kwargs.get("cascade", "")

        question_relation = Question.__sqlmodel_relationships__["options"]
        assert "delete-orphan" in question_relation.sa_relationship_kwargs.get("cascade", "")

    def test_quiz_filtering_logic_simulation(self):
        """
        RF-41. Filtros en listar cuestionarios
        Verificar la lógica de filtrado de cuestionarios (nuevos e inactivos) basada en metadatos del Quiz.
        """
        now = datetime.now(timezone.utc)
        quiz_new = Quiz(title="Quiz Nuevo", teacher_id=1, description="N", created_at=now)
        quiz_old = Quiz(title="Quiz Antiguo", teacher_id=1, description="O", created_at=now - timedelta(days=10))

        quizzes = [quiz_new, quiz_old]
        filtered_new = [q for q in quizzes if (now - q.created_at).days <= 7]

        assert quiz_new in filtered_new
        assert quiz_old not in filtered_new
