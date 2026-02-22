from sqlmodel import Session, delete, SQLModel
from .database import engine
from .models import Teacher, Group, Quiz, Question, Answer, Nickname, Room, StudentResult

def clear_database():
    with Session(engine) as session:
        session.exec(delete(StudentResult))
        session.exec(delete(Nickname))
        session.exec(delete(Room))
        session.exec(delete(Answer))
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
            title="Tema 1", 
            description="Test de nivel inicial sobre Python", 
            teacher_id=teacher.id
        )
        session.add(quiz)
        session.commit()
        session.refresh(quiz)

        question = Question(
            text="¿Cuál es la palabra clave para definir una función?", 
            quiz_id=quiz.id
        )
        session.add(question)
        session.commit()
        session.refresh(question)

        ans1 = Answer(text="def", is_correct=True, question_id=question.id)
        ans2 = Answer(text="function", is_correct=False, question_id=question.id)
        session.add_all([ans1, ans2])

        room = Room(
            join_code="23FK98", 
            is_active=False, 
            teacher_id=teacher.id,
            quiz_id=quiz.id,
            group_id=group.id
        )
        session.add(room)
        session.commit()
        session.refresh(room)

        student = Nickname(
            name="Franito", 
            room_id=room.id
        )
        session.add(student)
        session.commit()
        session.refresh(student)

        
        result = StudentResult(
            score=95.5,
            nickname_id=student.id,
            room_id=room.id
        )
        session.add(result)
        
        session.commit()
        print("Database populated with all entities.")

if __name__ == "__main__":
    clear_database()
    create_seed_data()