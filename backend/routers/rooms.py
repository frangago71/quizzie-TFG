from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models.rooms import Room, Participant, Answer, RoomStatus
from models.quizzes import Quiz
import random
import string

router = APIRouter(prefix="/content", tags=["Rooms"])

@router.get("/rooms", response_model=List[Room])
def get_rooms(session: Session = Depends(get_session)):
    return session.exec(select(Room)).all()

@router.post("/rooms", status_code=201)
def create_room(quiz_id: int, session: Session = Depends(get_session)):
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    active_room_statement = select(Room).where(
        Room.quiz_id == quiz_id, 
        Room.status != RoomStatus.FINISHED
    )
    if session.exec(active_room_statement).first():
        raise HTTPException(
            status_code=400, 
            detail="Ya existe una sala activa para este cuestionario."
        )
    unique_join_code = False
    new_join_code = "123456"
    while not unique_join_code:
        statement = select(Room).where(Room.join_code == new_join_code, Room.status != RoomStatus.FINISHED)
        if not session.exec(statement).first():
            unique_join_code = True 
        else:
            new_join_code = ''.join(random.choices(string.digits, k=6))
    new_room = Room(
        quiz_id=quiz_id,
        join_code=new_join_code,
        status=RoomStatus.WAITING,
        teacher_id=quiz.teacher_id
    )
    
    session.add(new_room)
    session.commit()
    session.refresh(new_room)
    
    return new_room

@router.get("/rooms/verify/{fullCode}")
def verify_room_code(fullCode: str, session: Session = Depends(get_session)):
    room = session.exec(select(Room).where(Room.join_code == fullCode)).first()
    if not room:
        raise HTTPException(
            status_code=404, 
            detail="No hay ninguna sala con ese código."
        )
    if room.status == "finished":
        raise HTTPException(
            status_code=400, 
            detail="La sala ya está en finished."
        )
    if room.status in ["waiting", "live"]:
        return {
            "success": True,
            "room_id": room.id,
            "status": room.status
        }
    raise HTTPException(
        status_code=400, 
        detail="La sala no está disponible en este momento."
    )

@router.get("/participants", response_model=List[Participant])
def get_participants(session: Session = Depends(get_session)):
    return session.exec(select(Participant)).all()

@router.get("/answers", response_model=List[Answer])
def get_answers(session: Session = Depends(get_session)):
    return session.exec(select(Answer)).all()

