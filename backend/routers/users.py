import re
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from auth import create_access_token, get_current_teacher_id, get_password_hash, verify_password
from database import get_session
from models.stage import RoomStatus
from models.users import Group, Student, Teacher, TeacherRead
from routers.content import Quiz
from schemas.content import QuizListRead
from schemas.users import (
    DeleteAccountRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    TeacherCreate,
    VerifyEmailRequest,
)

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
    if not teacher.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta no está verificada. Por favor, verifica tu correo primero.",
        )
    teacher_id_str = str(teacher.id)
    access_token = create_access_token(data={"sub": teacher_id_str})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/register",
    response_model=TeacherRead,
    status_code=201,
    responses={
        400: {"description": "El email o el nombre de usuario ya está registrado."},
        500: {"description": "Error interno al registrar el profesor."},
    },
)
async def register(teacher_data: TeacherCreate, session: Annotated[Session, Depends(get_session)]):
    existing_email = session.exec(
        select(Teacher).where(Teacher.email == teacher_data.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado.",
        )

    existing_username = session.exec(
        select(Teacher).where(Teacher.username == teacher_data.username)
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="El nombre de usuario ya está registrado.",
        )

    try:
        import random
        from datetime import datetime, timedelta, timezone

        from email_service import send_email

        hashed_password = get_password_hash(teacher_data.password)
        verification_code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        new_teacher = Teacher(
            username=teacher_data.username,
            email=teacher_data.email,
            hashed_password=hashed_password,
            is_verified=False,
            verification_code=verification_code,
            verification_code_expires_at=expires_at,
        )
        session.add(new_teacher)
        session.commit()
        session.refresh(new_teacher)

        email_body = f"""
        <html>
            <body>
                <h2>¡Hola, {new_teacher.username}!</h2>
                <p>Gracias por registrarte en Quizzie. Para activar tu cuenta,</p>
                <p>por favor introduce el siguiente código de verificación en la aplicación:</p>
                <h1 style="color: #55ccaa; font-size: 32px; letter-spacing: 5px;">
                    {verification_code}
                </h1>
                <p>Este código expira en 24 horas.</p>
                <p>Si no te has registrado en Quizzie, puedes ignorar este correo.</p>
            </body>
        </html>
        """
        send_email(
            to_email=new_teacher.email,
            subject="Verificación de cuenta en Quizzie",
            html_content=email_body,
        )

        return new_teacher
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error interno al registrar el profesor: {str(e)}"
        )


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


@router.get("/me", response_model=TeacherRead)
def get_me(
    teacher_id: Annotated[int, Depends(get_current_teacher_id)],
    session: Annotated[Session, Depends(get_session)],
):
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    if not teacher.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta no está verificada. Por favor, verifica tu correo primero.",
        )
    return teacher


@router.delete("/me", status_code=204)
def delete_me(
    delete_data: DeleteAccountRequest,
    teacher_id: Annotated[int, Depends(get_current_teacher_id)],
    session: Annotated[Session, Depends(get_session)],
):
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    if not verify_password(delete_data.password, teacher.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña introducida es incorrecta.")
    try:
        session.delete(teacher)
        session.commit()
        return
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar la cuenta: {str(e)}")


@router.post("/verify-email")
def verify_email(
    verify_data: VerifyEmailRequest,
    session: Annotated[Session, Depends(get_session)],
):
    from datetime import datetime, timezone

    teacher = session.exec(select(Teacher).where(Teacher.email == verify_data.email)).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if teacher.is_verified:
        access_token = create_access_token(data={"sub": str(teacher.id)})
        return {
            "message": "La cuenta ya está verificada.",
            "access_token": access_token,
            "token_type": "bearer",
        }

    if not teacher.verification_code or teacher.verification_code != verify_data.code:
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto.")

    now = datetime.now(timezone.utc)
    expires_at = teacher.verification_code_expires_at
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(
                status_code=400,
                detail="El código de verificación ha expirado. Por favor, solicita uno nuevo.",
            )

    teacher.is_verified = True
    teacher.verification_code = None
    teacher.verification_code_expires_at = None
    session.add(teacher)
    session.commit()

    access_token = create_access_token(data={"sub": str(teacher.id)})
    return {
        "message": "Cuenta verificada exitosamente.",
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/resend-verification")
def resend_verification(
    request_data: ForgotPasswordRequest,
    session: Annotated[Session, Depends(get_session)],
):
    import random
    from datetime import datetime, timedelta, timezone

    from email_service import send_email

    teacher = session.exec(select(Teacher).where(Teacher.email == request_data.email)).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if teacher.is_verified:
        return {"message": "La cuenta ya está verificada."}

    verification_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    teacher.verification_code = verification_code
    teacher.verification_code_expires_at = expires_at
    session.add(teacher)
    session.commit()

    email_body = f"""
    <html>
        <body>
            <h2>¡Hola, {teacher.username}!</h2>
            <p>Aquí tienes tu nuevo código para activar tu cuenta de Quizzie:</p>
            <h1 style="color: #55ccaa; font-size: 32px; letter-spacing: 5px;">
                {verification_code}
            </h1>
            <p>Este código expira en 24 horas.</p>
        </body>
    </html>
    """
    send_email(
        to_email=teacher.email,
        subject="Nuevo código de verificación - Quizzie",
        html_content=email_body,
    )
    return {"message": "Nuevo código enviado."}


@router.post("/forgot-password")
def forgot_password(
    request_data: ForgotPasswordRequest,
    session: Annotated[Session, Depends(get_session)],
):
    import random
    from datetime import datetime, timedelta, timezone

    from email_service import send_email

    teacher = session.exec(select(Teacher).where(Teacher.email == request_data.email)).first()
    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="No existe ninguna cuenta asociada a este correo electrónico.",
        )

    reset_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    teacher.reset_code = reset_code
    teacher.reset_code_expires_at = expires_at
    session.add(teacher)
    session.commit()

    email_body = f"""
    <html>
        <body>
            <h2>Restablecimiento de contraseña</h2>
            <p>Hemos recibido una solicitud para restablecer la contraseña</p>
            <p>de tu cuenta en Quizzie.</p>
            <p>Introduce el siguiente código de 6 dígitos para continuar:</p>
            <h1 style="color: #a946ab; font-size: 32px; letter-spacing: 5px;">{reset_code}</h1>
            <p>Este código expira en 15 minutos.</p>
            <p>Si no has solicitado este cambio, puedes ignorar este mensaje.</p>
        </body>
    </html>
    """
    send_email(
        to_email=teacher.email,
        subject="Recuperación de contraseña - Quizzie",
        html_content=email_body,
    )
    return {"message": "Código de restablecimiento enviado."}


@router.post("/reset-password")
def reset_password(
    reset_data: ResetPasswordRequest,
    session: Annotated[Session, Depends(get_session)],
):
    from datetime import datetime, timezone

    teacher = session.exec(select(Teacher).where(Teacher.email == reset_data.email)).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if not teacher.reset_code or teacher.reset_code != reset_data.code:
        raise HTTPException(status_code=400, detail="Código de restablecimiento incorrecto.")

    now = datetime.now(timezone.utc)
    expires_at = teacher.reset_code_expires_at
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(
                status_code=400, detail="El código ha expirado. Solicita uno nuevo."
            )

    teacher.hashed_password = get_password_hash(reset_data.new_password)
    teacher.reset_code = None
    teacher.reset_code_expires_at = None
    session.add(teacher)
    session.commit()

    access_token = create_access_token(data={"sub": str(teacher.id)})
    return {
        "message": "Contraseña restablecida exitosamente.",
        "access_token": access_token,
        "token_type": "bearer",
    }
