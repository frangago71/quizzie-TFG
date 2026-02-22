from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from typing import List
from pydantic import computed_field
from .database import get_session, engine
from .models import SQLModel, Teacher, Group, Quiz, Question, Answer, Room, Nickname, StudentResult

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    print("Base de datos iniciada correctamente y tablas verificadas")
    yield

app = FastAPI(
    title="Quizzie API",
    description="Aplicación para gestión de Quizzes en tiempo real",
    lifespan=lifespan
)

@app.get("/", tags=["Home"])
def read_root():
    return {"message": "¡Hola desde FastAPI + SQLModel!"}

class TeacherRead(SQLModel):
    id: int
    username: str
    email: str
    @computed_field(alias="hashed_password") 
    @property
    def masked_password(self) -> str:
        return "****"
    
@app.get("/teachers", response_model=List[TeacherRead], tags=["Users"])
def read_teachers(session: Session = Depends(get_session)):
    """
    Devuelve una lista de los profesores censurando su contraeña hasheada por seguridad.
    """
    return session.exec(select(Teacher)).all()

@app.get("/groups", response_model=List[Group], tags=["Users"])
def read_groups(session: Session = Depends(get_session)):
    return session.exec(select(Group)).all()

@app.get("/quizzes", response_model=List[Quiz], tags=["Content"])
def read_quizzes(session: Session = Depends(get_session)):
    return session.exec(select(Quiz)).all()

@app.get("/questions", response_model=List[Question], tags=["Content"])
def read_questions(session: Session = Depends(get_session)):
    return session.exec(select(Question)).all()

@app.get("/answers", response_model=List[Answer], tags=["Content"])
def read_answers(session: Session = Depends(get_session)):
    return session.exec(select(Answer)).all()

@app.get("/rooms", response_model=List[Room], tags=["Sessions"])
def read_rooms(session: Session = Depends(get_session)):
    return session.exec(select(Room)).all()

@app.get("/nicknames", response_model=List[Nickname], tags=["Sessions"])
def read_nicknames(session: Session = Depends(get_session)):
    return session.exec(select(Nickname)).all()

@app.get("/results", response_model=List[StudentResult], tags=["Results"])
def read_results(session: Session = Depends(get_session)):
    return session.exec(select(StudentResult)).all()