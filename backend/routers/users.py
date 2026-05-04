import re
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from auth import create_access_token, get_current_teacher_id, verify_password
from database import get_session
from models.stage import RoomStatus
from models.users import Group, Student, Teacher, TeacherRead
from routers.content import Quiz
from schemas.content import QuizListRead
from schemas.users import LoginRequest

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/login",
    responses={401: {"description": "Email o contraseña incorrectos"}},
)
async def login(login_data: LoginRequest, session: Annotated[Session, Depends(get_session)]):
    statement = select(Teacher).where(Teacher.email == login_data.email)
    teacher = session.exec(statement).first()
    if not teacher or not verify_password(login_data.password, teacher.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    teacher_id_str = str(teacher.id)
    access_token = create_access_token(data={"sub": teacher_id_str})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/teachers", response_model=List[TeacherRead])
def get_teachers(session: Annotated[Session, Depends(get_session)]):
    """Devuelve los profesores con la contraseña censurada."""
    return session.exec(select(Teacher)).all()


@router.get("/my-quizzes", response_model=List[QuizListRead])
def get_teacher_quizzes(
    teacher_id: Annotated[int, Depends(get_current_teacher_id)],
    session: Annotated[Session, Depends(get_session)],
):
    statement = select(Quiz).where(Quiz.teacher_id == teacher_id).options(selectinload(Quiz.rooms))
    quizzes = session.exec(statement).all()
    results = []
    for quiz in quizzes:
        active_room = next((r for r in quiz.rooms if r.status != RoomStatus.FINISHED), None)
        results.append(
            QuizListRead(
                id=quiz.id,
                title=quiz.title,
                description=quiz.description,
                created_at=quiz.created_at,
                active_room_id=active_room.id if active_room else None,
                active_room_status=active_room.status if active_room else None,
            )
        )

    return results


@router.get("/groups", response_model=List[Group])
def get_groups(session: Annotated[Session, Depends(get_session)]):
    return session.exec(select(Group)).all()


@router.get("/students", response_model=List[Student])
def get_students(session: Annotated[Session, Depends(get_session)]):
    return session.exec(select(Student)).all()


@router.get("/students/verify/{nickname}")
def verify_student(nickname: str, session: Annotated[Session, Depends(get_session)]):
    clean_nickname = nickname.strip()
    student = session.exec(
        select(Student).filter(func.lower(Student.name) == func.lower(clean_nickname))
    ).first()
    if not student:
        return {"exists": False, "message": "Nickname no encontrado en la base de datos"}

    return {"exists": True, "student_id": student.id, "nickname": student.name}


@router.post(
    "/students",
    responses={
        400: {"description": "Formato de uvus incorrecto o ya registrado."},
        500: {"description": "Error interno al crear el estudiante."},
    },
)
def create_student(nickname: str, session: Annotated[Session, Depends(get_session)]):
    clean_nickname = nickname.strip()
    uvus_pattern_number_letters = r"^[a-zA-Z]{3}\d{4}$"
    uvus_pattern_name = r"^[a-zA-Z]{9,12}\d{0,2}$"
    is_valid_a = re.match(uvus_pattern_number_letters, clean_nickname)
    is_valid_b = re.match(uvus_pattern_name, clean_nickname)

    if not (is_valid_a or is_valid_b):
        raise HTTPException(
            status_code=400,
            detail="Formato de uvus incorrecto.",
        )

    existing = session.exec(select(Student).where(Student.name == clean_nickname)).first()

    if existing:
        raise HTTPException(status_code=400, detail="Este nickname ya está registrado.")

    try:
        new_student = Student(name=clean_nickname)
        session.add(new_student)
        session.commit()
        session.refresh(new_student)

        return {"success": True, "student_id": new_student.id, "nickname": new_student.name}
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Error interno al crear el estudiante.")
