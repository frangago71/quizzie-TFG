from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str
    
    quizzes: List["Quiz"] = Relationship(back_populates="teacher")
    groups: List["Group"] = Relationship(back_populates="teacher")
    rooms: List["Room"] = Relationship(back_populates="teacher")

class Group(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    
    teacher_id: int = Field(foreign_key="teacher.id")
    teacher: Teacher = Relationship(back_populates="groups")
    
    rooms: List["Room"] = Relationship(back_populates="group")
    nicknames: List["Nickname"] = Relationship(back_populates="group")

class Nickname(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    
    room_id: Optional[int] = Field(default=None, foreign_key="room.id")
    room: Optional["Room"] = Relationship(back_populates="nicknames")
    
    group_id: Optional[int] = Field(default=None, foreign_key="group.id")
    group: Optional["Group"] = Relationship(back_populates="nicknames")
    
    results: List["StudentResult"] = Relationship(back_populates="nickname")

class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    
    teacher_id: int = Field(foreign_key="teacher.id")
    teacher: Teacher = Relationship(back_populates="quizzes")
    
    questions: List["Question"] = Relationship(back_populates="quiz")
    rooms: List["Room"] = Relationship(back_populates="quiz")

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    
    quiz_id: int = Field(foreign_key="quiz.id")
    quiz: Quiz = Relationship(back_populates="questions")
    
    answers: List["Answer"] = Relationship(back_populates="question")

class Answer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    is_correct: bool = Field(default=False)
    
    question_id: int = Field(foreign_key="question.id")
    question: Question = Relationship(back_populates="answers")

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
    nickname: Nickname = Relationship(back_populates="results")