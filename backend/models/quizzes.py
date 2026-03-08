from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel
from pydantic import field_validator

if TYPE_CHECKING:
    from .users import Teacher
    from .rooms import Room, Answer

def get_utc_now():
    return datetime.now(timezone.utc)

class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    tags: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)
    
    teacher_id: int = Field(foreign_key="teacher.id")
    teacher: "Teacher" = Relationship(back_populates="quizzes")
    
    questions: List["Question"] = Relationship(
        back_populates="quiz",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    rooms: List["Room"] = Relationship(back_populates="quiz")

    @field_validator("questions")
    @classmethod
    def check_max_questions(cls, v):
        if len(v) > 30:
            raise ValueError("A quiz cannot have more than 30 questions")
        return v

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    points: int = Field(default=1)
    
    quiz_id: int = Field(foreign_key="quiz.id")
    quiz: Quiz = Relationship(back_populates="questions")
    
    options: List["Option"] = Relationship(
        back_populates="question",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    answers: List["Answer"] = Relationship(back_populates="question")

    @field_validator("options")
    @classmethod
    def check_max_options(cls, v):
        if len(v) > 8:
            raise ValueError("A question cannot have more than 8 options")
        return v

class Option(SQLModel, table=True): 
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    is_correct: bool = Field(default=False)
    
    question_id: int = Field(foreign_key="question.id")
    question: Question = Relationship(back_populates="options")
    
    answers: List["Answer"] = Relationship(back_populates="option")