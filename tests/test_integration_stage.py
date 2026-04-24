import pytest
from fastapi.testclient import TestClient
from models.stage import RoomStatus, Room, Participant
from models.users import Teacher, Student
from models.content import Quiz, Question, Option

class TestStageIntegration:
    """
    Tests de integración para el dominio Stage.
    """

    def test_create_room_flow(self, client: TestClient, session):
        """Crear sala, verificar PIN por defecto y bloqueo de duplicados."""
        teacher = Teacher(
            username="profe_test", 
            email="test@test.com", 
            hashed_password="fakehashpassword"
        )
        session.add(teacher)
        session.commit()
        
        quiz = Quiz(title="Quiz Test", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()

        response = client.post("/stage/rooms", params={"quiz_id": quiz.id})
        assert response.status_code == 201
        assert response.json()["join_code"] == "123456"

        dup_response = client.post("/stage/rooms", params={"quiz_id": quiz.id})
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

        q1 = Quiz(title="Quiz 1", teacher_id=teacher.id, description="Description 1")
        q2 = Quiz(title="Quiz 2", teacher_id=teacher.id, description="Description 2")
        session.add_all([q1, q2])
        session.commit()

        client.post("/stage/rooms", params={"quiz_id": q1.id})

        response = client.post("/stage/rooms", params={"quiz_id": q2.id})
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
        quiz = Quiz(title="Quiz 1", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()
        
        client.post("/stage/rooms", params={"quiz_id": quiz.id})

        res_ok = client.get("/stage/rooms/verify/123456")
        assert res_ok.status_code == 200
        assert res_ok.json()["success"] is True

        res_404 = client.get("/stage/rooms/verify/000000")
        assert res_404.status_code == 404

    def test_participant_idempotency(self, client: TestClient, session):
        """Unirse a sala y evitar duplicados (Idempotencia)."""
        teacher = Teacher(
            username="profe_idem", 
            email="idem@test.com", 
            hashed_password="fakehashpassword"
        )
        student = Student(name="Alumno Test", email="a@t.com") 
        session.add_all([teacher, student])
        session.commit()
        
        quiz = Quiz(title="Quiz Idem", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()
        
        room_res = client.post("/stage/rooms", params={"quiz_id": quiz.id})
        room_id = room_res.json()["id"]

        params = {"student_id": student.id, "room_id": room_id}
        res1 = client.post("/stage/participants", params=params)
        assert res1.status_code == 200
        p_id = res1.json()["participant_id"]

        res2 = client.post("/stage/participants", params=params)
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
        
        quiz = Quiz(title="Quiz Ans", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()
        
        q1 = Question(text="Q1", quiz_id=quiz.id)
        session.add(q1)
        session.commit()
        
        opt1 = Option(text="Correct", is_correct=True, question_id=q1.id)
        session.add(opt1)
        session.commit()
        
        r_res = client.post("/stage/rooms", params={"quiz_id": quiz.id})
        r_id = r_res.json()["id"]
        
        p_res = client.post("/stage/participants", params={"student_id": student.id, "room_id": r_id})
        p_id = p_res.json()["participant_id"]

        answer_params = {
            "participant_id": p_id,
            "option_id": opt1.id,
            "question_id": q1.id
        }
        
        client.post("/stage/answers", params=answer_params)
        
        res2 = client.post("/stage/answers", params=answer_params)
        assert res2.status_code == 400
        assert "Ya has respondido" in res2.json()["detail"]

    def test_room_lifecycle_and_navigation(self, client: TestClient, session):
        """Flujo WAITING -> LIVE -> (next-question) -> FINISHED."""
        teacher = Teacher(username="master", email="m@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        
        # Creamos Quiz con 2 preguntas para probar el avance
        quiz = Quiz(title="Lifecycle", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()
        
        q1 = Question(text="Q1", quiz_id=quiz.id)
        q2 = Question(text="Q2", quiz_id=quiz.id)
        session.add_all([q1, q2])
        session.commit()

        room_res = client.post("/stage/rooms", params={"quiz_id": quiz.id})
        room_id = room_res.json()["id"]

        # Error 400 si intentamos avanzar sin estar LIVE
        bad_next = client.patch(f"/stage/rooms/{room_id}/next-question")
        assert bad_next.status_code == 400

        # Iniciar Quiz (WAITING -> LIVE)
        start_res = client.post(f"/stage/rooms/{room_id}/start")
        assert start_res.status_code == 200
        assert start_res.json()["status"] == RoomStatus.LIVE

        # Avanzar a la segunda pregunta
        next_res = client.patch(f"/stage/rooms/{room_id}/next-question")
        assert next_res.status_code == 200
        assert next_res.json()["current_question_index"] == 2

        # Pasar a fase de verificación
        verify_res = client.patch(f"/stage/rooms/{room_id}/next-question")
        assert verify_res.json()["status"] == "VERIFYING"

    def test_statistics_engine(self, client: TestClient, session):
        """Verificación de estadísticas por pregunta."""
        teacher = Teacher(username="stat_prof", email="s@t.com", hashed_password="x")
        student = Student(name="abc1234") 
        session.add_all([teacher, student])
        session.commit()
        
        quiz = Quiz(title="Stats", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()
        
        q1 = Question(text="Q1", quiz_id=quiz.id)
        session.add(q1)
        session.commit()
        
        opt1 = Option(text="Correct", is_correct=True, question_id=q1.id)
        session.add(opt1)
        session.commit()

        room_res = client.post("/stage/rooms", params={"quiz_id": quiz.id})
        room_id = room_res.json()["id"]
        
        # Unir participante
        p_res = client.post("/stage/participants", params={"student_id": student.id, "room_id": room_id})
        p_id = p_res.json()["participant_id"]

        # Responder
        client.post("/stage/answers", params={
            "participant_id": p_id, 
            "question_id": q1.id, 
            "option_id": opt1.id
        })

        # Finalizar pregunta
        stats_res = client.post(f"/stage/rooms/{room_id}/questions/{q1.id}/finish")
        assert stats_res.status_code == 200
        assert stats_res.json()["status"] == "success"

    def test_websocket_connection_and_errors(self, client: TestClient, session):
        """WebSockets y rutas inexistentes."""
        # Verificamos 404 para sala inexistente
        assert client.get("/stage/rooms/999").status_code == 404
        
        # Intentamos comenzar una sala que no existe
        assert client.post("/stage/rooms/999/start").status_code == 400
        # Setup para WebSocket
        teacher = Teacher(username="ws_user", email="ws@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        quiz = Quiz(title="WS", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()
        
        room_res = client.post("/stage/rooms", params={"quiz_id": quiz.id})
        room_id = room_res.json()["id"]

        # Abrir y cerrar WebSocket para cubrir el ConnectionManager
        with client.websocket_connect(f"/stage/rooms/{room_id}/ws") as websocket:
            # No enviamos nada, solo cerramos al salir del bloque
            pass

    def test_room_access_and_verify_errors(self, client: TestClient, session):
        """Errores de acceso (Sala finalizada o inexistente)."""
        teacher = Teacher(username="prof_err", email="err@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        
        room_fin = Room(quiz_id=1, join_code="999999", status=RoomStatus.FINISHED, teacher_id=teacher.id)
        session.add(room_fin)
        session.commit()
        
        res = client.get("/stage/rooms/verify/999999")
        assert res.status_code == 400
        assert "La sala ya está en finished" in res.json()["detail"]

    def test_participant_management_errors(self, client: TestClient, session):
        """Errores al vincular participantes (404 y 400)."""
        # Crear sala y estudiante para jugar con los límites
        room = Room(quiz_id=1, join_code="888888", status=RoomStatus.FINISHED, teacher_id=1)
        student = Student(name="abc0002")
        session.add_all([room, student])
        session.commit()

        # Estudiante no existe
        assert client.post("/stage/participants", params={"student_id": 999, "room_id": room.id}).status_code == 404
        # Sala no existe
        assert client.post("/stage/participants", params={"student_id": student.id, "room_id": 999}).status_code == 404
        # Unirse a sala ya cerrada
        res = client.post("/stage/participants", params={"student_id": student.id, "room_id": room.id})
        assert res.status_code == 400

    def test_room_details_live_and_participants_list(self, client: TestClient, session):
        """Detalles de sala activa y listado de nombres."""
        teacher = Teacher(username="prof_live", email="live@t.com", hashed_password="x")
        student = Student(name="abc0003")
        session.add_all([teacher, student])
        session.commit()
        
        quiz = Quiz(title="Live Quiz", teacher_id=teacher.id, description="Description")
        session.add(quiz)
        session.commit()
        session.add(Question(text="¿Cobertura 90%?", quiz_id=quiz.id))
        session.commit()

        room = Room(quiz_id=quiz.id, join_code="777777", status=RoomStatus.LIVE, 
                    current_question_index=1, teacher_id=teacher.id)
        session.add(room)
        session.commit()
        
        # Vinculamos participante para probar el listado 
        session.add(Participant(student_id=student.id, room_id=room.id))
        session.commit()

        # Probar listado de nombres
        res_names = client.get(f"/stage/rooms/{room.id}/participants")
        assert "abc0003" in res_names.json()

        # Probar detalles de sala LIVE 
        res_details = client.get(f"/stage/rooms/{room.id}")
        assert res_details.json()["text"] == "¿Cobertura 90%?"