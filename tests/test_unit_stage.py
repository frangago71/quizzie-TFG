import pytest
from models.rooms import Room, RoomStatus, Participant, Answer
from datetime import datetime

class TestStageUnit:
    """
    Tests unitarios para las entidades Room, Participant y Answer.
    """

    def test_new_room_initial_state(self):
        """Una sala nueva debe empezar en WAITING y con índice de pregunta 0."""
        room = Room(quiz_id=1, teacher_id=1, join_code="123456")
        
        assert room.status == RoomStatus.WAITING
        assert room.current_question_index == 0
        assert room.join_code == "123456"

    def test_participant_linkage(self):
        """Verificar que un participante se crea correctamente vinculado a una sala."""
        participant = Participant(student_id=5, room_id=10)
        
        assert participant.student_id == 5
        assert participant.room_id == 10
        assert isinstance(participant.joined_at, datetime)

    def test_answer_default_values(self):
        """Verificar que una respuesta nueva no tiene puntos por defecto."""
        answer = Answer(participant_id=1, question_id=1, option_id=1)
        
        assert answer.points_earned == 0
        assert answer.was_correct is False

    def test_room_status_enum(self):
        """Asegurar que los estados de la sala son los permitidos."""
        assert RoomStatus.WAITING == "waiting"
        assert RoomStatus.LIVE == "live"
        assert RoomStatus.FINISHED == "finished"

    def test_room_optional_group(self):
        """Verificar que el grupo es opcional al crear una sala."""
        room = Room(quiz_id=1, teacher_id=1, join_code="999999", group_id=None)
        assert room.group_id is None