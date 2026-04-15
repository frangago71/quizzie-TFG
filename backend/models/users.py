from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel
from pydantic import computed_field

if TYPE_CHECKING:
    from .content import Quiz
    from .rooms import Room, Participant

def get_utc_now():
    return datetime.now(timezone.utc)

class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str
    
    quizzes: List["Quiz"] = Relationship(back_populates="teacher")
    groups: List["Group"] = Relationship(back_populates="teacher")
    rooms: List["Room"] = Relationship(back_populates="teacher")

class TeacherRead(SQLModel):
    id: int
    username: str
    email: str
    
    @computed_field(alias="hashed_password") 
    @property
    def masked_password(self) -> str:
        return "****"
        
class Group(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    
    teacher_id: int = Field(foreign_key="teacher.id")
    teacher: Teacher = Relationship(back_populates="groups")
    
    rooms: List["Room"] = Relationship(back_populates="group")
    students: List["Student"] = Relationship(back_populates="group")

class Student(SQLModel, table=True): 
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    
    group_id: Optional[int] = Field(default=None, foreign_key="group.id")
    group: Optional[Group] = Relationship(back_populates="students")
    
    participations: List["Participant"] = Relationship(
        back_populates="student",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )