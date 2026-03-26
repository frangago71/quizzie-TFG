from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select
from typing import List
from database import get_session
from models.rooms import Room, Participant, Answer, RoomStatus
from models.quizzes import Quiz, Question, Option  
from models.users import Student
import random
import string

router = APIRouter(prefix="/content", tags=["Rooms"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)

    async def broadcast_to_room(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/rooms/{room_id}/ws")
async def websocket_endpoint(websocket: WebSocket, room_id: int):
    await manager.connect(websocket, room_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)


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
    if room.status == RoomStatus.FINISHED:
        raise HTTPException(
            status_code=400, 
            detail="La sala ya está en finished."
        )
    if room.status in [RoomStatus.WAITING, RoomStatus.LIVE]:
        return {
            "success": True,
            "room_id": room.id,
            "status": room.status
        }
    raise HTTPException(
        status_code=400, 
        detail="La sala no está disponible en este momento."
    )

@router.get("/rooms/{room_id}/participants")
def get_participants_names_by_room(room_id: int, session: Session = Depends(get_session)):
    statement = (
        select(Student.name)
        .join(Participant, Participant.student_id == Student.id)
        .where(Participant.room_id == room_id)
    )
    participants = session.exec(statement).all()
    return list(participants)

@router.post("/rooms/{room_id}/start")
async def start_quiz(room_id: int, session: Session = Depends(get_session)):
    room = session.get(Room, room_id)
    statement = (
        select(Question)
        .where(Question.quiz_id == room.quiz_id)
        .order_by(Question.id)
    )
    first_question = session.exec(statement).first()

    if room.status != RoomStatus.WAITING:
        raise HTTPException(status_code=400, detail="No se puede iniciar. La sala no está en estado WAITING.")

    room.status = RoomStatus.LIVE
    room.current_question_index = 1
    session.commit()

    await manager.broadcast_to_room(room_id, {
        "type": "game_start",
        "data": {
            "question_id": 1,
            "text": first_question.text,
            "response_time": 45, # Segundos para responder, se modificará en el room set up en un futuro
            "options": [
                {"id": opt.id, "text": opt.text} 
                for opt in first_question.options
            ]
        }
    })

    return {"status": "started"}

@router.patch("/rooms/{room_id}/next-question")
async def next_question(room_id: int, db: Session = Depends(get_session)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    if room.status != RoomStatus.LIVE:
        raise HTTPException(
            status_code=400, 
            detail="La sala debe estar abierta para pasar de pregunta"
        )

    questions = db.query(Question).filter(Question.quiz_id == room.quiz_id).order_by(Question.id).all()
        
    next_index = room.current_question_index + 1

    if next_index <= len(questions):
        next_q = questions[next_index - 1]
        room.current_question_index = next_index
        db.commit()

        await manager.broadcast_to_room(room_id, {
            "type": "next_question",
            "data": {
                "question_index": next_index,
                "text": next_q.text,
                "options": [{"id": opt.id, "text": opt.text} for opt in next_q.options]
            }
        })
        return {"status": "success", "index": next_index}

    else:
        room.status = RoomStatus.FINISHED
        room.current_question_index = 0
        room.join_code = None
        db.commit()

        await manager.broadcast_to_room(room_id, {
            "type": "game_over",
            "data": {"status": "FINISHED"}
        })
        return {"status": "FINISHED", "message": "Quiz completado"}

@router.get("/participants", response_model=List[Participant])
def get_participants(session: Session = Depends(get_session)):
    return session.exec(select(Participant)).all()

@router.post("/participants")
async def create_participant(student_id: int, room_id: int, session: Session = Depends(get_session)):
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado.")

    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")
    
    if room.status not in [RoomStatus.WAITING, RoomStatus.LIVE]:
        raise HTTPException(
            status_code=400, 
            detail=f"No puedes unirte. La sala está cerrada"
        )

    statement = select(Participant).where(
        Participant.student_id == student_id,
        Participant.room_id == room_id
    )
    existing = session.exec(statement).first()
    
    if existing:
        await notify_room_update(room_id, session)
        return {
            "success": True, 
            "message": "El estudiante ya forma parte de la sala.",
            "room_id": room_id,
            "student_id": student_id
        }

    new_participant = Participant(student_id=student_id, room_id=room_id)

    try:
        session.add(new_participant)
        session.commit()
    
        await notify_room_update(room_id, session)

        return {
            "success": True,
            "message": "Participante vinculado correctamente.",
            "room_id": room_id,
            "student_id": student_id
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al vincular: {str(e)}")

async def notify_room_update(room_id: int, session: Session):
    statement = (
        select(Student.name)
        .join(Participant, Participant.student_id == Student.id)
        .where(Participant.room_id == room_id)
    )
    participants = session.exec(statement).all()
    
    await manager.broadcast_to_room(room_id, {
        "type": "participants_update",
        "list": list(participants)
    })

@router.get("/answers", response_model=List[Answer])
def get_answers(session: Session = Depends(get_session)):
    return session.exec(select(Answer)).all()

