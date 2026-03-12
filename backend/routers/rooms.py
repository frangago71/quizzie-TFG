from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from database import get_session
from models.rooms import Room, Participant, Answer

router = APIRouter(prefix="/content", tags=["Rooms"])

@router.get("/rooms", response_model=List[Room])
def get_rooms(session: Session = Depends(get_session)):
    return session.exec(select(Room)).all()

@router.get("/participants", response_model=List[Participant])
def get_participants(session: Session = Depends(get_session)):
    return session.exec(select(Participant)).all()

@router.get("/answers", response_model=List[Answer])
def get_answers(session: Session = Depends(get_session)):
    return session.exec(select(Answer)).all()

