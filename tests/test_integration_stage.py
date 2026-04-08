import pytest
from fastapi.testclient import TestClient
from models.rooms import RoomStatus
from models.users import Teacher, Student
from models.quizzes import Quiz

class TestStageIntegration:
    """
    Tests de integración para el dominio Stage.
    """

    def test_create_room_flow(self, client: TestClient, session):
        """Crear sala, verificar PIN por defecto y bloqueo de duplicados."""
        # 1. Crear dependencias con campos obligatorios (username y password)
        teacher = Teacher(
            username="profe_test", 
            email="test@test.com", 
            hashed_password="fakehashpassword"
        )
        session.add(teacher)
        session.commit()
        
        quiz = Quiz(title="Quiz Test", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()

        # 2. Crear la primera sala (debe ser 123456)
        response = client.post("/content/rooms", params={"quiz_id": quiz.id})
        assert response.status_code == 201
        assert response.json()["join_code"] == "123456"

        # 3. Intentar crear duplicada para el mismo Quiz
        dup_response = client.post("/content/rooms", params={"quiz_id": quiz.id})
        assert dup_response.status_code == 400
        assert "Ya existe una sala activa" in dup_response.json()["detail"]

    def test_pin_collision_logic(self, client: TestClient, session):
        """Generar código aleatorio si 123456 ya está pillado."""
        teacher = Teacher(
            username="profe_collision", 
            email="collision@test.com", 
            hashed_password="fakehashpassword"
        )
        session.add(teacher)
        session.commit()

        q1 = Quiz(title="Quiz 1", teacher_id=teacher.id)
        q2 = Quiz(title="Quiz 2", teacher_id=teacher.id)
        session.add_all([q1, q2])
        session.commit()

        # Sala 1 se queda con el 123456
        client.post("/content/rooms", params={"quiz_id": q1.id})

        # Sala 2 debe generar uno aleatorio
        response = client.post("/content/rooms", params={"quiz_id": q2.id})
        assert response.status_code == 201
        new_code = response.json()["join_code"]
        assert new_code != "123456"
        assert len(new_code) == 6

    def test_verify_room_code(self, client: TestClient, session):
        """Verificar códigos de sala activos y terminados."""
        teacher = Teacher(
            username="profe_verify", 
            email="verify@test.com", 
            hashed_password="fakehashpassword"
        )
        session.add(teacher)
        session.commit()
        quiz = Quiz(title="Quiz 1", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        
        client.post("/content/rooms", params={"quiz_id": quiz.id})

        res_ok = client.get("/content/rooms/verify/123456")
        assert res_ok.status_code == 200
        assert res_ok.json()["success"] is True

        res_404 = client.get("/content/rooms/verify/000000")
        assert res_404.status_code == 404

    def test_participant_idempotency(self, client: TestClient, session):
        """Escenario 4: Unirse a sala y evitar duplicados (Idempotencia)."""
        teacher = Teacher(
            username="profe_idem", 
            email="idem@test.com", 
            hashed_password="fakehashpassword"
        )
        student = Student(name="Alumno Test", email="a@t.com") 
        session.add_all([teacher, student])
        session.commit()
        
        quiz = Quiz(title="Quiz Idem", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        
        room_res = client.post("/content/rooms", params={"quiz_id": quiz.id})
        room_id = room_res.json()["id"]

        params = {"student_id": student.id, "room_id": room_id}
        res1 = client.post("/content/participants", params=params)
        assert res1.status_code == 200
        p_id = res1.json()["participant_id"]

        res2 = client.post("/content/participants", params=params)
        assert res2.status_code == 200
        assert res2.json()["participant_id"] == p_id
        assert "ya forma parte de la sala" in res2.json()["message"]

    def test_submit_answer_integrity(self, client: TestClient, session):
        """Escenario 6: Bloquear segundas respuestas del mismo participante."""
        teacher = Teacher(
            username="profe_ans", 
            email="ans@test.com", 
            hashed_password="fakehashpassword"
        )
        student = Student(name="Alumno Ans", email="ans_stu@test.com")
        session.add_all([teacher, student])
        session.commit()
        
        quiz = Quiz(title="Quiz Ans", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        
        r_res = client.post("/content/rooms", params={"quiz_id": quiz.id})
        r_id = r_res.json()["id"]
        
        p_res = client.post("/content/participants", params={"student_id": student.id, "room_id": r_id})
        p_id = p_res.json()["participant_id"]

        answer_params = {
            "participant_id": p_id,
            "option_id": 1,
            "question_id": 1
        }
        
        # Primera respuesta
        client.post("/content/answers", params=answer_params)
        
        # Segunda respuesta (Debe fallar con 400)
        res2 = client.post("/content/answers", params=answer_params)
        assert res2.status_code == 400
        assert "Ya has respondido" in res2.json()["detail"]