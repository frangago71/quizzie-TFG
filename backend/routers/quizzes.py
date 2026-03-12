from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from database import get_session
from models.quizzes import Quiz, Question, Option
from schemas.quizzes import QuizCreate, QuestionCreate, OptionCreate

router = APIRouter(prefix="/content", tags=["Quizzes"])

@router.get("/quizzes", response_model=List[Quiz])
def get_quizzes(session: Session = Depends(get_session)):
    return session.exec(select(Quiz)).all()

def get_current_teacher_id():
    # Se modificará cuando se implemente la gestión de usuarios y autenticación
    return 1

@router.post("/quizzes", status_code=201)
def get_quiz(quiz_data: QuizCreate,  session: Session = Depends(get_session), 
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
