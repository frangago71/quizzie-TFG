from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models.content import Quiz, Question, Option
from models.stage import RoomStatus, Room
from schemas.content import QuizCreate, QuestionCreate, OptionCreate, QuizRead, QuestionRead, OptionRead, QuizUpdate
from sqlalchemy.orm import selectinload
from auth import get_current_teacher_id

router = APIRouter(prefix="/content", tags=["Content"])

@router.get("/quizzes", response_model=List[Quiz])
def get_quizzes(session: Session = Depends(get_session)):
    return session.exec(select(Quiz)).all()

@router.get("/quizzes/{quiz_id}", response_model=QuizRead) 
def get_quiz(quiz_id: int, session: Session = Depends(get_session)):
    statement = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.questions).selectinload(Question.options)
        )
    )
    quiz = session.exec(statement).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    return quiz

@router.post("/quizzes", status_code=201)
def post_quiz(quiz_data: QuizCreate,  session: Session = Depends(get_session), 
                                teacher_id: int = Depends(get_current_teacher_id)):
    db_quiz = Quiz(
        title=quiz_data.title,
        description=quiz_data.description,
        teacher_id=teacher_id
    )
    session.add(db_quiz)
    for q in quiz_data.questions:
        db_question = Question(
            text=q.text, 
            points=q.points, 
            quiz=db_quiz
        )
        session.add(db_question)
        for o in q.options:
            db_option = Option(
                text=o.text, 
                is_correct=o.is_correct, 
                question=db_question
            )
            session.add(db_option) 
    session.commit()
    session.refresh(db_quiz)
    return {"message": "Quiz creado con éxito", "quiz_id": db_quiz.id}

@router.put("/quizzes/{quiz_id}")
def update_quiz(
    quiz_id: int,
    quiz_data: QuizUpdate,
    session: Session = Depends(get_session),
    teacher_id: int = Depends(get_current_teacher_id)
):
    if len(quiz_data.questions) == 0:
        raise HTTPException(status_code=400, detail="El cuestionario debe tener al menos una pregunta.")
        
    statement = select(Quiz).where(Quiz.id == quiz_id).options(
        selectinload(Quiz.questions).selectinload(Question.options)
    )
    db_quiz = session.exec(statement).first()
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    if db_quiz.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="No tienes permiso")
        
    db_quiz.title = quiz_data.title
    if quiz_data.description is not None:
        db_quiz.description = quiz_data.description
    
    incoming_q_ids = [q.id for q in quiz_data.questions if q.id is not None]
    
    questions_to_delete = [q for q in db_quiz.questions if q.id not in incoming_q_ids]
    for q in questions_to_delete:
        session.delete(q)
        
    for q_data in quiz_data.questions:
        if q_data.id:
            db_question = next((q for q in db_quiz.questions if q.id == q_data.id), None)
            if db_question:
                db_question.text = q_data.text
                db_question.points = q_data.points
                
                incoming_o_ids = [o.id for o in q_data.options if o.id is not None]
                options_to_delete = [o for o in db_question.options if o.id not in incoming_o_ids]
                for o in options_to_delete:
                    session.delete(o)
                
                for o_data in q_data.options:
                    if o_data.id:
                        db_option = next((o for o in db_question.options if o.id == o_data.id), None)
                        if db_option:
                            db_option.text = o_data.text
                            db_option.is_correct = o_data.is_correct
                    else:
                        new_option = Option(text=o_data.text, is_correct=o_data.is_correct, question=db_question)
                        session.add(new_option)
        else:
            new_question = Question(text=q_data.text, points=q_data.points, quiz=db_quiz)
            session.add(new_question)
            for o_data in q_data.options:
                new_option = Option(text=o_data.text, is_correct=o_data.is_correct, question=new_question)
                session.add(new_option)

    session.commit()
    return {"message": "Quiz actualizado con éxito"}

@router.delete("/quizzes/{quiz_id}")
def delete_quiz(
    quiz_id: int, 
    session: Session = Depends(get_session),
    teacher_id: int = Depends(get_current_teacher_id)
):
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    if quiz.teacher_id != teacher_id:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para realizar esta acción"
        )
    session.delete(quiz)
    session.commit()
    return {"ok": True, "message": "Cuestionario eliminado. Las salas se han conservado."}

@router.delete("/quizzes/{quiz_id}/hard")
def delete_quiz_and_rooms(
    quiz_id: int, 
    session: Session = Depends(get_session), 
    teacher_id: int = Depends(get_current_teacher_id)
):
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    if quiz.teacher_id != teacher_id:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para realizar esta acción"
        )
    active_rooms = [
        r for r in quiz.rooms 
        if r.status in [RoomStatus.LIVE, RoomStatus.WAITING]
    ]
    if active_rooms:
        raise HTTPException(
            status_code=400, 
            detail=(
                f"No se puede borrar el cuestionario porque tiene una sala activa."
            )
        )
    for room in quiz.rooms:
        session.delete(room)
    session.delete(quiz)
    session.commit()
    return {"ok": True, "message": "Cuestionario y sus salas eliminados correctamente."}

@router.get("/quizzes/{quiz_id}/rooms", response_model=List[Room])
def get_quiz_rooms(quiz_id: int, session: Session = Depends(get_session)):
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    return quiz.rooms

@router.get("/questions", response_model=List[Question])
def get_questions(session: Session = Depends(get_session)):
    return session.exec(select(Question)).all()

@router.get("/questions/{question_id}", response_model=Question)
def get_question(question_id: int, session: Session = Depends(get_session)):
    db_question = session.get(Question, question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    return db_question

@router.post("/quizzes/{quiz_id}/questions", response_model=QuestionRead)
def create_question(
    quiz_id: int,
    question_data: QuestionCreate, 
    teacher_id: int = Depends(get_current_teacher_id),
    session: Session = Depends(get_session)
):
    quiz = session.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    if quiz.teacher_id != teacher_id:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para añadir preguntas a este cuestionario"
        )
    new_question = Question(
        text=question_data.text,
        points=question_data.points,
        quiz_id=quiz_id
    )
    session.add(new_question)
    session.commit()
    session.refresh(new_question)
    for opt in question_data.options:
        new_option = Option(
            text=opt.text,
            is_correct=opt.is_correct,
            question_id=new_question.id
        )
        session.add(new_option)
    session.commit()
    session.refresh(new_question) 
    return new_question

@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int, 
    teacher_id: int = Depends(get_current_teacher_id),
    session: Session = Depends(get_session)
):
    db_question = session.get(Question, question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    if db_question.quiz.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para borrar esta pregunta")
    if len(db_question.quiz.questions) <= 1:
        raise HTTPException(
            status_code=400, 
            detail="No puedes borrar la última pregunta. El cuestionario debe tener al menos una."
        )
    session.delete(db_question)
    session.commit()
    return {"ok": True, "message": "Pregunta eliminada correctamente"}

@router.get("/options", response_model=List[Option])
def get_options(session: Session = Depends(get_session)):
    return session.exec(select(Option)).all()

@router.get("/options/{option_id}", response_model=Option)
def get_option(option_id: int, session: Session = Depends(get_session)):
    db_option = session.get(Option, option_id)
    if not db_option:
        raise HTTPException(status_code=404, detail="Opción no encontrada")
    return db_option

@router.post("/questions/{question_id}/options", response_model=OptionRead) 
def create_option(
    question_id: int,
    option_data: OptionCreate, 
    teacher_id: int = Depends(get_current_teacher_id),
    session: Session = Depends(get_session)
):
    question = session.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    if question.quiz.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="No puedes añadir opciones a esta pregunta")
    new_option = Option(**option_data.model_dump(), question_id=question_id)
    
    session.add(new_option)
    session.commit()
    session.refresh(new_option)
    
    return new_option

@router.delete("/options/{option_id}")
def delete_option(
    option_id: int, 
    teacher_id: int = Depends(get_current_teacher_id),
    session: Session = Depends(get_session)
):
    db_option = session.get(Option, option_id)
    if not db_option:
        raise HTTPException(status_code=404, detail="Opción no encontrada")
    if db_option.question.quiz.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    parent_question = db_option.question
    if len(parent_question.options) <= 2:
        raise HTTPException(
            status_code=400, 
            detail="No puedes borrar esta opción. Cada pregunta debe tener al menos dos opciones."
        )
    if db_option.is_correct:
        correct_options = [o for o in parent_question.options if o.is_correct]
        if len(correct_options) <= 1:
            raise HTTPException(
                status_code=400, 
                detail="No puedes borrar la única opción correcta. Una pregunta siempre debe tener una respuesta válida."
            )
    session.delete(db_option)
    session.commit()
    return {"ok": True, "message": "Opción eliminada"}