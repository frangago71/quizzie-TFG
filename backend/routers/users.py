from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models.users import Teacher, Group, Student, TeacherRead

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/teachers", response_model=List[TeacherRead])
def get_teachers(session: Session = Depends(get_session)):
    """Devuelve los profesores con la contraseña censurada."""
    return session.exec(select(Teacher)).all()

@router.get("/groups", response_model=List[Group])
def get_groups(session: Session = Depends(get_session)):
    return session.exec(select(Group)).all()

@router.get("/students", response_model=List[Student])
def get_students(session: Session = Depends(get_session)):
    return session.exec(select(Student)).all()