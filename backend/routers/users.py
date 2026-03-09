from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models.quizzes import Quiz
from ..models.users import Teacher, Group, Student, TeacherRead

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/teachers", response_model=List[TeacherRead])
def get_teachers(session: Session = Depends(get_session)):
    """Devuelve los profesores con la contraseña censurada."""
    return session.exec(select(Teacher)).all()

def get_current_teacher_id():
    # Se modificará cuando se implemente la gestión de usuarios y autenticación
    return 1

@router.get("/{teacher_id}/quizzes/", response_model=List[Quiz])
def get_teacher_quizzes(teacher_id: int = Depends(get_current_teacher_id), session: Session = Depends(get_session)):
    return session.exec(select(Quiz).where(Quiz.teacher_id == teacher_id)).all()

@router.get("/groups", response_model=List[Group])
def get_groups(session: Session = Depends(get_session)):
    return session.exec(select(Group)).all()

@router.get("/students", response_model=List[Student])
def get_students(session: Session = Depends(get_session)):
    return session.exec(select(Student)).all()