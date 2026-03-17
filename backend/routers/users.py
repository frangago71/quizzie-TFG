from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func
from typing import List
from database import get_session
from routers.quizzes import Quiz
from models.users import Teacher, Group, Student, TeacherRead
import re


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

@router.get("/students/verify/{nickname}")
def verify_student(nickname: str, session: Session = Depends(get_session)):
    clean_nickname = nickname.strip()
    statement = select(Student).where(func.lower(Student.name) == clean_nickname.lower())
    student = session.exec(statement).first()
    if student:
        return {
            "exists": True,
            "message": "Estudiante encontrado.",
            "student_id": student.id,
            "nickname": student.name
        }
    raise HTTPException(
        status_code=404, 
        detail="No hay ningún estudiante con ese uvus registrado. ¿Deseas registrar este uvus?"
    )

@router.post("/students")
def create_student(nickname: str, session: Session = Depends(get_session)):
    clean_nickname = nickname.strip()
    uvus_pattern_number_letters = r"^[a-zA-Z]{3}\d{4}$"
    uvus_pattern_name = r"^[a-zA-Z]{9,12}\d{0,2}$"
    is_valid_a = re.match(uvus_pattern_number_letters, clean_nickname)
    is_valid_b = re.match(uvus_pattern_name, clean_nickname)

    if not (is_valid_a or is_valid_b):
        raise HTTPException(
            status_code=400,
            detail="Formato de uvus incorrecto. Debe tener 3 letras seguidas de 4 números, o las 3 primeras letras de tu nombre y apellidos."
        )

    existing = session.exec(
        select(Student).where(Student.name == clean_nickname)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Este nickname ya está registrado.")

    try:
        new_student = Student(name=clean_nickname)
        session.add(new_student)
        session.commit()
        session.refresh(new_student)
        
        return {
            "success": True,
            "student_id": new_student.id,
            "nickname": new_student.name
        }
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Error interno al crear el estudiante.")