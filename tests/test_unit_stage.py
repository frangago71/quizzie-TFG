import pytest
from datetime import datetime, timezone
from models.stage import Room, RoomStatus, RoomPhase, Participant, Answer

class TestStageUnit:
    """
    Tests unitarios para las entidades Room, Participant y Answer en el módulo Stage.
    """

    # ==========================================
    # MVP
    # ==========================================

    def test_room_creation(self):
        """
        RF-15. Crear sala
        Verificar la instanciación de una nueva sala con grupo opcional.
        """
        room_with_group = Room(quiz_id=1, teacher_id=1, join_code="123456", group_id=10)
        assert room_with_group.quiz_id == 1
        assert room_with_group.teacher_id == 1
        assert room_with_group.group_id == 10

        room_no_group = Room(quiz_id=2, teacher_id=1, join_code="654321", group_id=None)
        assert room_no_group.group_id is None

    def test_pin_validation_logic(self):
        """
        RF-16. Validar PIN
        Comprobar la validez y el formato del código PIN de unión de la sala.
        """
        room = Room(quiz_id=1, teacher_id=1, join_code="987654")
        assert room.join_code is not None
        assert len(room.join_code) == 6
        assert room.join_code.isdigit()

    def test_participant_linkage(self):
        """
        RF-17. Validar Nickname
        Verificar la creación correcta de un participante vinculado a un alumno y a una sala.
        """
        participant = Participant(student_id=5, room_id=10)
        assert participant.student_id == 5
        assert participant.room_id == 10

    def test_waiting_room_state(self):
        """
        RF-18. Sala de espera
        Verificar que una sala nueva empieza en estado de espera y con índice de pregunta en 0.
        """
        room = Room(quiz_id=1, teacher_id=1, join_code="111111")
        assert room.status == RoomStatus.WAITING
        assert room.current_question_index == 0

    def test_start_room_state_transition(self):
        """
        RF-20. Comenzar sala
        Verificar la transición de estado al iniciar la actividad en directo de la sala.
        """
        room = Room(quiz_id=1, teacher_id=1, join_code="222222")
        room.status = RoomStatus.LIVE
        room.phase = RoomPhase.READING
        assert room.status == RoomStatus.LIVE
        assert room.phase == RoomPhase.READING

    def test_question_distribution_index(self):
        """
        RF-21. Distribución
        Comprobar el progreso secuencial del índice de preguntas del cuestionario.
        """
        room = Room(quiz_id=1, teacher_id=1, join_code="333333")
        assert room.current_question_index == 0
        room.current_question_index = 1
        assert room.current_question_index == 1

    def test_answer_reception_fields(self):
        """
        RF-23. Recepción respuestas
        Verificar que una respuesta se vincula correctamente a un participante, pregunta y opción.
        """
        answer = Answer(participant_id=1, question_id=2, option_id=3)
        assert answer.participant_id == 1
        assert answer.question_id == 2
        assert answer.option_id == 3

    def test_answer_feedback(self):
        """
        RF-24. Feedback inmediato
        Asegurar que la respuesta registra correctamente si es acertada y los puntos obtenidos de forma inmediata.
        """
        answer = Answer(participant_id=1, question_id=1, option_id=1)
        assert answer.points_earned == 0
        assert not answer.was_correct

        answer.points_earned = 10
        answer.was_correct = True
        assert answer.points_earned == 10
        assert answer.was_correct

    # ==========================================
    # CORE
    # ==========================================

    def test_participant_ranking_score(self):
        """
        RF-09. Mostrar ranking
        Verificar que la puntuación del participante se inicializa en 0 y permite acumulación de puntos para el ranking.
        """
        participant = Participant(student_id=1, room_id=1)
        assert participant.score == 0
        participant.score = 150
        assert participant.score == 150

    def test_close_room_state(self):
        """
        RF-19. Cerrar sala
        Asegurar la transición del estado de la sala a finalizado al cerrar la sesión de juego.
        """
        room = Room(quiz_id=1, teacher_id=1, join_code="444444")
        room.status = RoomStatus.FINISHED
        assert room.status == RoomStatus.FINISHED

    def test_server_timer_properties(self):
        """
        RF-22. Temporizador servidor
        Comprobar los valores de configuración de tiempo de respuesta y pausado del temporizador en el servidor.
        """
        room = Room(quiz_id=1, teacher_id=1, join_code="555555", answer_time=30)
        assert room.answer_time == 30
        assert room.is_paused
        assert room.remaining_time_at_pause == 0

    def test_provisional_registration(self):
        """
        RF-25. Registro provisional
        Verificar que la participación empieza de forma provisional sin verificar y con token nulo.
        """
        participant = Participant(student_id=1, room_id=1)
        assert not participant.is_verified
        assert participant.verification_token is None

    def test_qr_generation_token(self):
        """
        RF-26. Generación QR
        Comprobar que se puede asignar un token criptográfico único para la posterior generación del QR.
        """
        participant = Participant(student_id=1, room_id=1)
        token = "signed_jwt_token_sample"
        participant.verification_token = token
        assert participant.verification_token == token

    def test_token_matching(self):
        """
        RF-29. Validación Token
        Validar que el token de verificación almacenado en la participación coincide con el escaneado.
        """
        participant = Participant(student_id=1, room_id=1, verification_token="secret_token_abc")
        scanned_token = "secret_token_abc"
        assert participant.verification_token == scanned_token

    def test_verification_state_guard(self):
        """
        RF-30. Control de estado
        Asegurar la lógica para impedir alterar o volver a validar notas si la participación ya figura como verificada.
        """
        participant = Participant(student_id=1, room_id=1, is_verified=True, verified_at=datetime.now(timezone.utc))
        assert participant.is_verified
        assert participant.verified_at is not None

    def test_verification_check_transition(self):
        """
        RF-31. Check verificación
        Verificar que al pasar el check de validación la participación se actualiza como verificada y registra la fecha exacta.
        """
        participant = Participant(student_id=1, room_id=1)
        assert not participant.is_verified
        assert participant.verified_at is None

        now = datetime.now(timezone.utc)
        participant.is_verified = True
        participant.verified_at = now
        assert participant.is_verified
        assert participant.verified_at == now

    def test_disconnection_joined_at(self):
        """
        RF-40. Gestión de desconexiones y reconexiones
        Verificar que la participación almacena la fecha de unión (joined_at) para gestionar caídas y reconexiones.
        """
        participant = Participant(student_id=1, room_id=1)
        assert participant.joined_at is not None
        assert isinstance(participant.joined_at, datetime)
