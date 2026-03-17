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


@router.post("/participants")
def create_participant(student_id: int, room_id: int, session: Session = Depends(get_session)):
    student = session.get(models.Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado.")

    room = session.get(models.Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")
    
    if room.status not in ["waiting", "live"]:
        raise HTTPException(
            status_code=400, 
            detail=f"No puedes unirte. La sala está en estado: {room.status}"
        )

    statement = select(models.Participant).where(
        models.Participant.student_id == student_id,
        models.Participant.room_id == room_id
    )
    existing = session.exec(statement).first()
    
    if existing:
        return {
            "success": True, 
            "message": "El estudiante ya forma parte de la sala.",
            "room_id": room_id,
            "student_id": student_id
        }

    new_participant = models.Participant(
        student_id=student_id,
        room_id=room_id
    )

    try:
        session.add(new_participant)
        session.commit()
        
        return {
            "success": True,
            "message": "Participante vinculado correctamente.",
            "room_id": room_id,
            "student_id": student_id
        }
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Error al vincular el estudiante a la sala.")

@router.get("/answers", response_model=List[Answer])
def get_answers(session: Session = Depends(get_session)):
    return session.exec(select(Answer)).all()

