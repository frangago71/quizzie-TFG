import asyncio
import random
import secrets
import string
from datetime import timedelta
from datetime import timezone as tz
from typing import Annotated, Dict, List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from database import get_session
from models.content import Option, Question, Quiz
from models.stage import Answer, Participant, Room, RoomPhase, RoomStatus, get_utc_now
from models.users import Student

router = APIRouter(prefix="/stage", tags=["Stage"])


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
                try:
                    await connection.send_json(message)
                except Exception:
                    self.active_connections[room_id].remove(connection)


manager = ConnectionManager()


def get_calculated_time_left(room: Room) -> int:
    if room.is_paused:
        return room.remaining_time_at_pause
    if not room.timer_started_at:
        return room.remaining_time_at_pause

    now = get_utc_now()
    started_at = room.timer_started_at
    if started_at.tzinfo is None:
        from datetime import timezone as tz

        started_at = started_at.replace(tzinfo=tz.utc)

    elapsed = (now - started_at).total_seconds()
    calculated_time = room.remaining_time_at_pause - int(elapsed)
    return max(0, min(room.answer_time, calculated_time))


async def timer_sync_loop():
    from database import engine

    while True:
        await asyncio.sleep(1)
        with Session(engine) as session:
            statement = select(Room).where(Room.status == RoomStatus.LIVE)
            rooms = session.exec(statement).all()
            for room in rooms:
                time_left = get_calculated_time_left(room)
                await manager.broadcast_to_room(
                    room.id,
                    {
                        "type": "timer_update",
                        "data": {"time_left": time_left, "is_paused": room.is_paused},
                    },
                )


async def _handle_teacher_connect(room_id: int, engine):
    with Session(engine) as session:
        room = session.get(Room, room_id)
        if room and room.status == RoomStatus.LIVE and room.is_paused:
            started_at = room.timer_started_at
            if started_at and started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=tz.utc)

            if not (started_at and started_at > get_utc_now()):
                room.timer_started_at = get_utc_now()

            room.is_paused = False
            session.add(room)
            session.commit()
            await manager.broadcast_to_room(
                room_id,
                {
                    "type": "timer_update",
                    "data": {"time_left": get_calculated_time_left(room), "is_paused": False},
                },
            )


async def _handle_teacher_disconnect(room_id: int, engine):
    with Session(engine) as session:
        room = session.get(Room, room_id)
        if room and room.status == RoomStatus.LIVE:
            room.remaining_time_at_pause = get_calculated_time_left(room)
            room.is_paused = True
            session.add(room)
            session.commit()
            await manager.broadcast_to_room(
                room_id,
                {
                    "type": "timer_update",
                    "data": {"time_left": room.remaining_time_at_pause, "is_paused": True},
                },
            )


@router.websocket("/rooms/{room_id}/ws")
async def websocket_endpoint(websocket: WebSocket, room_id: int, role: str = "student"):
    from database import engine

    await manager.connect(websocket, room_id)

    if role == "teacher":
        await _handle_teacher_connect(room_id, engine)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        if role == "teacher":
            await _handle_teacher_disconnect(room_id, engine)


@router.get("/rooms", response_model=List[Room])
def get_rooms(session: Annotated[Session, Depends(get_session)]):
    return session.exec(select(Room)).all()


@router.post(
    "/rooms",
    status_code=201,
    responses={
        404: {"description": "Quiz no encontrado"},
        400: {"description": "Ya existe una sala activa para este quiz"},
    },
)
def create_room(
    quiz_id: int, session: Annotated[Session, Depends(get_session)], answer_time: int = 45
):
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    active_room_statement = select(Room).where(
        Room.quiz_id == quiz_id, Room.status != RoomStatus.FINISHED
    )
    active_room = session.exec(active_room_statement).first()
    if active_room:
        raise HTTPException(status_code=400, detail="Ya existe una sala activa para este quiz")
    unique_join_code = False
    new_join_code = "123456"
    while not unique_join_code:
        statement = select(Room).where(
            Room.join_code == new_join_code, Room.status != RoomStatus.FINISHED
        )
        if not session.exec(statement).first():
            unique_join_code = True
        else:
            new_join_code = "".join(random.choices(string.digits, k=6))
    new_room = Room(
        quiz_id=quiz_id,
        join_code=new_join_code,
        status=RoomStatus.WAITING,
        teacher_id=quiz.teacher_id,
        answer_time=answer_time,
    )
    session.add(new_room)
    session.commit()
    session.refresh(new_room)

    return new_room


@router.get(
    "/rooms/verify/{fullcode}",
    responses={
        404: {"description": "No hay ninguna sala con ese código."},
        400: {"description": "La sala no está disponible en este momento."},
    },
)
def verify_room_code(fullcode: str, session: Annotated[Session, Depends(get_session)]):
    room = session.exec(select(Room).where(Room.join_code == fullcode)).first()
    if not room:
        raise HTTPException(status_code=404, detail="No hay ninguna sala con ese código.")
    if room.status == RoomStatus.FINISHED:
        raise HTTPException(status_code=400, detail="La sala ya está en finished.")
    if room.status in [RoomStatus.WAITING, RoomStatus.LIVE]:
        return {"success": True, "room_id": room.id, "status": room.status}
    raise HTTPException(status_code=400, detail="La sala no está disponible en este momento.")


@router.get("/rooms/{room_id}/participants")
def get_participants_names_by_room(room_id: int, session: Annotated[Session, Depends(get_session)]):
    statement = (
        select(Student.name)
        .join(Participant, Participant.student_id == Student.id)
        .where(Participant.room_id == room_id)
    )
    participants = session.exec(statement).all()
    return list(participants)


@router.get(
    "/rooms/{room_id}",
    responses={404: {"description": "Sala no encontrada"}},
)
def get_room_details(room_id: int, session: Annotated[Session, Depends(get_session)]):
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    total_questions = session.exec(
        select(func.count(Question.id)).where(Question.quiz_id == room.quiz_id)
    ).one()

    current_q_data = None
    time_left = 0
    calculated_phase = room.phase or "waiting"

    if room.status == RoomStatus.LIVE and room.current_question_index > 0:
        statement = select(Question).where(Question.quiz_id == room.quiz_id).order_by(Question.id)
        questions = session.exec(statement).all()

        if 0 < room.current_question_index <= len(questions):
            q = questions[room.current_question_index - 1]
            current_q_data = {
                "text": q.text,
                "current_question_index": room.current_question_index,
                "question_id": q.id,
                "options": [{"id": opt.id, "text": opt.text} for opt in q.options],
            }

            time_left = get_calculated_time_left(room)
            calculated_phase = room.phase or RoomPhase.ANSWERING

    extra_data = {}
    if calculated_phase == RoomPhase.RESULTS:
        stats_dict = {}
        for opt in room.quiz.questions[room.current_question_index - 1].options:
            count = session.exec(
                select(func.count(Answer.id)).where(Answer.option_id == opt.id)
            ).one()
            stats_dict[str(opt.id)] = count

        correct_option = next(
            (
                opt
                for opt in room.quiz.questions[room.current_question_index - 1].options
                if opt.is_correct
            ),
            None,
        )
        extra_data["statistics"] = stats_dict
        extra_data["correct_option_id"] = correct_option.id if correct_option else None

    if calculated_phase == RoomPhase.LEADERBOARD or room.status in [
        RoomStatus.VERIFYING,
        RoomStatus.FINISHED,
    ]:
        lb_statement = (
            select(Student.name, Participant.score)
            .join(Student, Participant.student_id == Student.id)
            .where(Participant.room_id == room.id)
            .order_by(Participant.score.desc())
            .limit(10)
        )
        lb_results = session.exec(lb_statement).all()
        extra_data["leaderboard"] = [{"name": r[0], "score": r[1]} for r in lb_results]

    return {
        "id": room.id,
        "status": room.status,
        "join_code": room.join_code,
        "current_question_index": room.current_question_index,
        "total_questions": total_questions,
        "phase": calculated_phase,
        "time_left": time_left,
        "answer_time": room.answer_time,
        "is_paused": room.is_paused,
        **extra_data,
        **(current_q_data or {"text": "Sala inactiva", "options": []}),
    }


@router.post(
    "/rooms/{room_id}/start",
    responses={
        404: {"description": "Sala no encontrada"},
        400: {"description": "No se puede iniciar la sala."},
    },
)
async def start_quiz(room_id: int, session: Annotated[Session, Depends(get_session)]):
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status != RoomStatus.WAITING:
        raise HTTPException(status_code=400, detail="No se puede iniciar la sala.")

    statement = select(Question).where(Question.quiz_id == room.quiz_id).order_by(Question.id)
    questions = session.exec(statement).all()
    first_question = questions[0]

    room.status = RoomStatus.LIVE
    room.current_question_index = 1
    room.phase = RoomPhase.ANSWERING
    room.phase_start_time = get_utc_now()
    room.remaining_time_at_pause = room.answer_time
    room.timer_started_at = get_utc_now() + timedelta(seconds=3)
    room.is_paused = False
    session.commit()

    data = {
        "status": room.status,
        "current_question_index": 1,
        "total_questions": len(questions),
        "question_id": first_question.id,
        "text": first_question.text,
        "options": [{"id": opt.id, "text": opt.text} for opt in first_question.options],
    }

    await manager.broadcast_to_room(room_id, {"type": "room_start", "data": data})
    return data


@router.patch(
    "/rooms/{room_id}/next-question",
    responses={
        404: {"description": "Sala no encontrada"},
        400: {"description": "Sala no disponible"},
    },
)
async def next_question(room_id: int, db: Annotated[Session, Depends(get_session)]):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status != RoomStatus.LIVE:
        raise HTTPException(status_code=400, detail="Sala no disponible")

    questions = db.exec(
        select(Question).where(Question.quiz_id == room.quiz_id).order_by(Question.id)
    ).all()
    next_index = room.current_question_index + 1

    if next_index <= len(questions):
        next_q = questions[next_index - 1]
        room.current_question_index = next_index
        room.phase = RoomPhase.ANSWERING
        room.phase_start_time = get_utc_now()
        room.remaining_time_at_pause = room.answer_time
        room.timer_started_at = get_utc_now()
        room.is_paused = False
        db.commit()

        data = {
            "current_question_index": next_index,
            "total_questions": len(questions),
            "question_id": next_q.id,
            "text": next_q.text,
            "options": [{"id": opt.id, "text": opt.text} for opt in next_q.options],
        }
        await manager.broadcast_to_room(room_id, {"type": "next_question", "data": data})
        return data
    else:
        room.status = RoomStatus.VERIFYING

        statement = select(Participant).where(Participant.room_id == room_id)
        participants = db.exec(statement).all()
        for p in participants:
            p.verification_token = secrets.token_hex(8)
            db.add(p)

        db.commit()
        await manager.broadcast_to_room(
            room_id,
            {
                "type": "room_verifying",
                "data": {"status": "VERIFYING", "total_questions": len(questions)},
            },
        )
        return {"status": "VERIFYING"}


@router.post(
    "/rooms/{room_id}/timer/stop",
    responses={404: {"description": "Sala no encontrada"}},
)
async def stop_timer(room_id: int, db: Annotated[Session, Depends(get_session)]):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room.remaining_time_at_pause = 0
    room.is_paused = True
    db.add(room)
    db.commit()
    await manager.broadcast_to_room(
        room_id, {"type": "timer_update", "data": {"time_left": 0, "is_paused": True}}
    )
    return {"status": "success"}


class VerificationRequest(BaseModel):
    nickname: str
    token: str


@router.post(
    "/rooms/{room_id}/verify-participant",
    responses={
        404: {"description": "Participante no encontrado"},
        400: {"description": "Token de verificación inválido"},
        409: {"description": "Este resultado ya ha sido verificado anteriormente."},
    },
)
async def verify_participant(
    room_id: int, req: VerificationRequest, db: Annotated[Session, Depends(get_session)]
):
    statement = (
        select(Participant)
        .join(Student)
        .where(Student.name == req.nickname, Participant.room_id == room_id)
    )
    participant = db.exec(statement).first()

    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    if participant.verification_token != req.token:
        raise HTTPException(status_code=400, detail="Token de verificación inválido")

    if participant.is_verified:
        raise HTTPException(
            status_code=409, detail="Este resultado ya ha sido verificado anteriormente."
        )

    actual_score = sum(a.points_earned for a in participant.answers)
    if participant.score != actual_score:
        participant.score = actual_score

    participant.is_verified = True
    participant.verified_at = get_utc_now()
    db.add(participant)
    db.commit()

    await manager.broadcast_to_room(
        room_id,
        {
            "type": "participant_verified",
            "data": {"nickname": req.nickname, "participant_id": participant.id},
        },
    )

    return {"status": "success", "nickname": req.nickname}


@router.post(
    "/rooms/{room_id}/finish",
    responses={400: {"description": "La sala no está en fase de verificación o ya ha finalizado"}},
)
async def finish_room(room_id: int, db: Annotated[Session, Depends(get_session)]):
    room = db.get(Room, room_id)
    if not room or room.status != RoomStatus.VERIFYING:
        raise HTTPException(
            status_code=400, detail="La sala no está en fase de verificación o ya ha finalizado"
        )

    room.status = RoomStatus.FINISHED
    room.join_code = None
    db.commit()

    await manager.broadcast_to_room(
        room_id, {"type": "room_finish", "data": {"status": "FINISHED"}}
    )
    return {"status": "FINISHED"}


@router.post(
    "/rooms/{room_id}/force-finish",
    responses={
        404: {"description": "Sala no encontrada"},
        400: {"description": "La sala ya está finalizada"},
    },
)
async def force_finish_room(room_id: int, db: Annotated[Session, Depends(get_session)]):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status == RoomStatus.FINISHED:
        raise HTTPException(status_code=400, detail="La sala ya está finalizada")

    room.status = RoomStatus.FINISHED
    room.join_code = None
    db.commit()

    await manager.broadcast_to_room(
        room_id, {"type": "room_finish", "data": {"status": "FINISHED"}}
    )
    return {"status": "FINISHED"}


@router.get("/participants", response_model=List[Participant])
def get_participants(session: Annotated[Session, Depends(get_session)]):
    return session.exec(select(Participant)).all()


@router.post(
    "/participants",
    responses={
        404: {"description": "Estudiante o sala no encontrados."},
        400: {"description": "No puedes unirte. La sala está cerrada"},
        500: {"description": "Error al vincular"},
    },
)
async def create_participant(
    student_id: int, room_id: int, session: Annotated[Session, Depends(get_session)]
):
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado.")

    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")

    if room.status not in [RoomStatus.WAITING, RoomStatus.LIVE]:
        raise HTTPException(status_code=400, detail="No puedes unirte. La sala está cerrada")

    statement = select(Participant).where(
        Participant.student_id == student_id, Participant.room_id == room_id
    )
    existing = session.exec(statement).first()

    if existing:
        await notify_room_update(room_id, session)
        return {
            "success": True,
            "message": "El estudiante ya forma parte de la sala.",
            "room_id": room_id,
            "student_id": student_id,
            "participant_id": existing.id,
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
            "student_id": student_id,
            "participant_id": new_participant.id,
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

    await manager.broadcast_to_room(
        room_id, {"type": "participants_update", "list": list(participants)}
    )


@router.get("/answers", response_model=List[Answer])
def get_answers(session: Annotated[Session, Depends(get_session)]):
    return session.exec(select(Answer)).all()


@router.post(
    "/answers",
    status_code=201,
    responses={
        404: {"description": "Participante no encontrado"},
        400: {"description": "Ya has respondido a esta pregunta."},
    },
)
def submit_answer(
    participant_id: int,
    option_id: int,
    question_id: int,
    session: Annotated[Session, Depends(get_session)],
):
    existing = session.exec(
        select(Answer).where(
            Answer.participant_id == participant_id, Answer.question_id == question_id
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya has respondido a esta pregunta.")
    option = session.get(Option, option_id)
    question = session.get(Question, question_id)
    participant = session.get(Participant, participant_id)

    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    time_left = get_calculated_time_left(participant.room)

    if option.is_correct:
        participant.score += question.points
        session.add(participant)

    new_answer = Answer(
        participant_id=participant_id,
        option_id=option_id,
        question_id=question_id,
        was_correct=option.is_correct,
        points_earned=question.points if option.is_correct else 0,
        remaining_time=time_left,
    )
    session.add(new_answer)
    session.commit()
    return {"success": True}


@router.get("/rooms/{room_id}/leaderboard")
def get_leaderboard(room_id: int, session: Annotated[Session, Depends(get_session)]):
    statement = (
        select(Student.name, Participant.score)
        .join(Participant, Participant.student_id == Student.id)
        .where(Participant.room_id == room_id)
        .order_by(Participant.score.desc())
        .limit(3)
    )
    results = session.exec(statement).all()
    return [{"name": r[0], "score": r[1]} for r in results]


@router.post(
    "/rooms/{room_id}/leaderboard/show",
    responses={404: {"description": "Sala no encontrada"}},
)
async def show_leaderboard(room_id: int, db: Annotated[Session, Depends(get_session)]):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room.phase = "leaderboard"
    room.phase_start_time = get_utc_now()
    db.commit()

    lb_statement = (
        select(Student.name, Participant.score)
        .join(Student, Participant.student_id == Student.id)
        .where(Participant.room_id == room_id)
        .order_by(Participant.score.desc())
        .limit(10)
    )
    lb_results = db.exec(lb_statement).all()
    leaderboard = [{"name": r[0], "score": r[1]} for r in lb_results]

    await manager.broadcast_to_room(
        room_id, {"type": "show_leaderboard", "data": {"leaderboard": leaderboard}}
    )
    return {"status": "success"}


@router.post(
    "/rooms/{room_id}/questions/{question_id}/finish",
    responses={404: {"description": "Sala no encontrada"}},
)
async def finish_question(
    room_id: int, question_id: int, db: Annotated[Session, Depends(get_session)]
):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    stats_query = (
        select(Answer.option_id, func.count(Answer.id).label("total"))
        .join(Participant, Answer.participant_id == Participant.id)
        .where(Participant.room_id == room_id)
        .where(Answer.question_id == question_id)
        .group_by(Answer.option_id)
    )
    results = db.exec(stats_query).all()
    stats_dict = {str(row.option_id): row.total for row in results}
    correct_option = db.exec(
        select(Option).where(Option.question_id == question_id, Option.is_correct)
    ).first()

    room.phase = "results"
    room.phase_start_time = get_utc_now()
    db.commit()

    await manager.broadcast_to_room(
        room_id,
        {
            "type": "show_results",
            "data": {
                "statistics": stats_dict,
                "question_id": question_id,
                "correct_option_id": correct_option.id,
            },
        },
    )
    return {"status": "success", "question_id": question_id}


@router.get(
    "/rooms/{room_id}/participants/{participant_id}/stats",
    responses={404: {"description": "Participante no encontrado en esta sala."}},
)
def get_participant_stats(
    room_id: int, participant_id: int, session: Annotated[Session, Depends(get_session)]
):
    participant = session.get(Participant, participant_id)
    if not participant or participant.room_id != room_id:
        raise HTTPException(status_code=404, detail="Participante no encontrado en esta sala.")

    room = session.get(Room, room_id)
    total_questions = session.exec(
        select(func.count(Question.id)).where(Question.quiz_id == room.quiz_id)
    ).one()

    statement = (
        select(func.count(Answer.id))
        .join(Option, Answer.option_id == Option.id)
        .where(Answer.participant_id == participant_id)
        .where(Option.is_correct)
    )
    correct_answers = session.exec(statement).one()

    return {
        "score": participant.score,
        "correct_answers": correct_answers,
        "total_questions": total_questions,
        "verification_token": participant.verification_token,
        "is_verified": participant.is_verified,
    }
