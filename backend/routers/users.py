from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models.users import Teacher, Group, Nickname, TeacherRead

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/teachers", response_model=List[TeacherRead])
def read_teachers(session: Session = Depends(get_session)):
    """Devuelve los profesores con la contraseña censurada."""
    return session.exec(select(Teacher)).all()

@router.get("/groups", response_model=List[Group])
def read_groups(session: Session = Depends(get_session)):
    return session.exec(select(Group)).all()

@router.get("/nicknames", response_model=List[Nickname])
def read_nicknames(session: Session = Depends(get_session)):
    return session.exec(select(Nickname)).all()