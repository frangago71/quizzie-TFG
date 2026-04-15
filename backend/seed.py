from datetime import datetime, timezone
from sqlmodel import Session, delete, SQLModel
from database import engine
from models.users import Teacher, Group, Student
from models.content import Quiz, Question, Option
from models.stage import Room, Participant, Answer, RoomStatus

def clear_database():
    with Session(engine) as session:
        session.exec(delete(Answer))
        session.exec(delete(Participant))
        session.exec(delete(Student))
        session.exec(delete(Room))
        session.exec(delete(Option))
        session.exec(delete(Question))
        session.exec(delete(Quiz))
        session.exec(delete(Group))
        session.exec(delete(Teacher))
        session.commit()

def create_seed_data():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        teacher = Teacher(
            username="Arturo Coello", 
            email="acoello@tfg.com", 
            hashed_password="fake1234"
        )
        session.add(teacher)
        session.commit()
        session.refresh(teacher)

        group = Group(
            name="FP Grupo de Tarde", 
            teacher_id=teacher.id
        )
        session.add(group)
        
        quiz = Quiz(
            title="Tema 1: Python Basics", 
            description="Test de nivel inicial sobre Python", 
            image_url="ejemplo.png",
            tags="python, backend, beginners",
            teacher_id=teacher.id
        )
        session.add(quiz)
        session.commit()
        session.refresh(quiz)

        question = Question(
            text="¿Cuál es la palabra clave para definir una función?", 
            points=1,
            quiz_id=quiz.id
        )
        session.add(question)
        session.commit()
        session.refresh(question)

        opt1 = Option(text="def", is_correct=True, question_id=question.id)
        opt2 = Option(text="function", is_correct=False, question_id=question.id)
        session.add_all([opt1, opt2])
        session.commit()
        session.refresh(opt1)

        room = Room(
            join_code="987654", 
            status=RoomStatus.WAITING,
            teacher_id=teacher.id,
            quiz_id=quiz.id,
            group_id=group.id
        )
        session.add(room)
        session.commit()
        session.refresh(room)

        student = Student(
            name="Franito", 
            group_id=group.id
        )
        session.add(student)
        session.commit()
        session.refresh(student)

        participant = Participant(
            student_id=student.id,
            room_id=room.id
        )
        session.add(participant)
        session.commit()
        session.refresh(participant)

        result = Answer(
            points_earned=1,
            was_correct=True,
            participant_id=participant.id,
            room_id=room.id,
            question_id=question.id,
            option_id=opt1.id
        )
        session.add(result)
        
        session.commit()
        print("Base de datos poblada correctamente.")

if __name__ == "__main__":
    SQLModel.metadata.create_all(engine)
    clear_database()
    create_seed_data()

