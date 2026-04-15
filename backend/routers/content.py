from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models.content import Quiz, Question, Option
from schemas.content import QuizCreate, QuestionCreate, OptionCreate, QuizRead, QuestionRead, OptionRead
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/content", tags=["Content"])

@router.get("/quizzes", response_model=List[Quiz])
def get_quizzes(session: Session = Depends(get_session)):
    return session.exec(select(Quiz)).all()

def get_current_teacher_id():
    # Se modificará cuando se implemente la gestión de usuarios y autenticación
    return 1


@router.get("/quizzes/{quiz_id}", response_model=QuizRead) 
def get_quiz(quiz_id: int, session: Session = Depends(get_session)):
    statement = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.questions).selectinload(Question.options)
        )
    )
    quiz = session.exec(statement).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    return quiz

@router.post("/quizzes", status_code=201)
def post_quiz(quiz_data: QuizCreate,  session: Session = Depends(get_session), 
                                teacher_id: int = Depends(get_current_teacher_id)):
    db_quiz = Quiz(
        title=quiz_data.title,
        description=quiz_data.description,
        teacher_id=teacher_id
    )
    session.add(db_quiz)
    
    for q in quiz_data.questions:
        db_question = Question(
            text=q.text, 
            points=q.points, 
            quiz=db_quiz
        )
        session.add(db_question)
        
        for o in q.options:
            db_option = Option(
                text=o.text, 
                is_correct=o.is_correct, 
                question=db_question
            )
            session.add(db_option)
            
    session.commit()
    session.refresh(db_quiz)
    return {"message": "Quiz creado con éxito", "quiz_id": db_quiz.id}

@router.get("/questions", response_model=List[Question])
def get_questions(session: Session = Depends(get_session)):
    return session.exec(select(Question)).all()

@router.get("/options", response_model=List[Option])
def get_options(session: Session = Depends(get_session)):
    return session.exec(select(Option)).all()
