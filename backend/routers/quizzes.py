from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models.quizzes import Quiz, Question, Answer

router = APIRouter(prefix="/content", tags=["Quizzes"])

@router.get("/quizzes", response_model=List[Quiz])
def read_quizzes(session: Session = Depends(get_session)):
    return session.exec(select(Quiz)).all()

@router.get("/questions", response_model=List[Question])
def read_questions(session: Session = Depends(get_session)):
    return session.exec(select(Question)).all()

@router.get("/answers", response_model=List[Answer])
def read_answers(session: Session = Depends(get_session)):
    return session.exec(select(Answer)).all()

