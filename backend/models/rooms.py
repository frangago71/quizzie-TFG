from typing import List, Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .users import Teacher, Group, Nickname
    from .quizzes import Quiz

class Room(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    join_code: str = Field(unique=True)
    is_active: bool = Field(default=True)
    
    teacher_id: int = Field(foreign_key="teacher.id")
    teacher: "Teacher" = Relationship(back_populates="rooms")
    
    quiz_id: int = Field(foreign_key="quiz.id")
    quiz: "Quiz" = Relationship(back_populates="rooms")
    
    group_id: Optional[int] = Field(default=None, foreign_key="group.id")
    group: Optional["Group"] = Relationship(back_populates="rooms")

    nicknames: List["Nickname"] = Relationship(back_populates="room")
    results: List["StudentResult"] = Relationship(back_populates="room")

class StudentResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    score: int = Field(default=0)
    
    room_id: int = Field(foreign_key="room.id")
    room: Room = Relationship(back_populates="results")
    
    nickname_id: int = Field(foreign_key="nickname.id")
    nickname: "Nickname" = Relationship(back_populates="results")