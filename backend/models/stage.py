from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel
from enum import Enum

if TYPE_CHECKING:
    from .users import Teacher, Group, Student
    from .content import Quiz, Question, Option

def get_utc_now():
    return datetime.now(timezone.utc)

class RoomStatus(str, Enum):
    WAITING = "waiting"
    LIVE = "live"
    VERIFYING = "verifying"
    FINISHED = "finished"

class RoomPhase(str, Enum):
    READING = "reading"
    ANSWERING = "answering"
    RESULTS = "results"
    LEADERBOARD = "leaderboard"
    
class Room(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    join_code: Optional[str] = Field(default=123456, unique=True)
    status: RoomStatus = Field(default=RoomStatus.WAITING)  
    created_at: datetime = Field(default_factory=get_utc_now)
    current_question_index: int = Field(default=0)
    phase: Optional[RoomPhase] = Field(default=None) 
    phase_start_time: Optional[datetime] = Field(default=None)
    answer_time: int = Field(default=45)
    remaining_time_at_pause: int = Field(default=0)
    timer_started_at: Optional[datetime] = Field(default=None)
    is_paused: bool = Field(default=True)
    
    teacher_id: int = Field(foreign_key="teacher.id")
    teacher: "Teacher" = Relationship(back_populates="rooms")

    quiz_id: Optional[int] = Field(default=None, foreign_key="quiz.id", nullable=True)
    quiz: "Quiz" = Relationship(back_populates="rooms")
    
    group_id: Optional[int] = Field(default=None, foreign_key="group.id")
    group: Optional["Group"] = Relationship(back_populates="rooms")

    participants: List["Participant"] = Relationship(
        back_populates="room",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class Participant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    joined_at: datetime = Field(default_factory=get_utc_now)
    score: int = Field(default=0)
    is_verified: bool = Field(default=False)
    verified_at: Optional[datetime] = Field(default=None)
    verification_token: Optional[str] = Field(default=None)
     
    student_id: int = Field(foreign_key="student.id")
    student: "Student" = Relationship(back_populates="participations")
    
    room_id: int = Field(foreign_key="room.id")
    room: Room = Relationship(back_populates="participants")
    answers: List["Answer"] = Relationship(
        back_populates="participant",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class Answer(SQLModel, table=True): 
    id: Optional[int] = Field(default=None, primary_key=True)
    points_earned: int = Field(default=0)
    was_correct: bool = Field(default=False)
    remaining_time: int = Field(default=0)
    created_at: datetime = Field(default_factory=get_utc_now)
    
    participant_id: int = Field(foreign_key="participant.id")
    participant: Participant = Relationship(back_populates="answers")

    question_id: Optional[int] = Field(default=None, foreign_key="question.id", ondelete="SET NULL")
    question: Optional["Question"] = Relationship(back_populates="answers")
    
    option_id: Optional[int] = Field(default=None, foreign_key="option.id", ondelete="SET NULL")
    option: Optional["Option"] = Relationship(back_populates="answers")