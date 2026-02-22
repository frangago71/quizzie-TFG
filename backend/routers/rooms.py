from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..database import get_session
from ..models.rooms import Room, StudentResult

router = APIRouter(prefix="/content", tags=["Rooms"])

@router.get("/rooms", response_model=List[Room])
def read_rooms(session: Session = Depends(get_session)):
    return session.exec(select(Room)).all()

@router.get("/results", response_model=List[StudentResult])
def read_results(session: Session = Depends(get_session)):
    return session.exec(select(StudentResult)).all()

