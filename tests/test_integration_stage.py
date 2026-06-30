import pytest
import asyncio
from fastapi.testclient import TestClient
from models.stage import RoomStatus, Room, RoomPhase, Participant, Answer
from models.users import Teacher, Student
from models.content import Quiz, Question, Option
from auth import create_access_token
from routers.stage import manager, timer_sync_loop

class TestStageIntegration:
    def setup_entities(self, session):
        # Configuración de entidades para las pruebas del módulo stage (RF-15)
        t = Teacher(username="t_stage", email="ts@t.com", hashed_password="x")
        session.add(t)
        session.commit()
        q = Quiz(title="Q_Stage", description="D", teacher_id=t.id)
        session.add(q)
        session.commit()
        qu1 = Question(text="Q1", quiz_id=q.id, points=10)
        qu2 = Question(text="Q2", quiz_id=q.id, points=10)
        session.add_all([qu1, qu2])
        session.commit()
        o1 = Option(text="O1", is_correct=True, question_id=qu1.id)
        o2 = Option(text="O2", is_correct=True, question_id=qu2.id)
        session.add_all([o1, o2])
        session.commit()
        s = Student(name="S1")
        session.add(s)
        session.commit()
        return q, qu1, qu2, o1, t, s

    # ==========================================
    # MVP
    # ==========================================

    def test_live_room_control(self, client: TestClient, session):
        """
        HU-PR-04: Control de sala en vivo (RF-15, RF-18, RF-19, RF-20, RF-22)
        Flujo de creación de sala, visualización del estado de espera, inicio, temporizador y cierre de sala.
        """
        q, qu1, qu2, o1, t, s = self.setup_entities(session)

        # Error 404 al intentar crear una sala para un cuestionario inexistente (RF-15)
        assert client.post("/stage/rooms", params={"quiz_id": 9999}).status_code == 404

        # Crear sala para el cuestionario (RF-15)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        assert res_c.status_code == 201
        r_id = res_c.json()["id"]

        # Error 400 al intentar crear otra sala teniendo ya una sala activa para el cuestionario (RF-15)
        assert client.post("/stage/rooms", params={"quiz_id": q.id}).status_code == 400

        # Error 404 al obtener detalles de una sala inexistente (RF-15)
        assert client.get("/stage/rooms/999").status_code == 404

        # Comprobar detalles de la sala en directo en estado WAITING (RF-18)
        res_det = client.get(f"/stage/rooms/{r_id}")
        assert res_det.json()["status"].upper() == "WAITING"
        assert res_det.json()["current_question_index"] == 0

        # Iniciar la sala y verificar transición a LIVE (RF-20)
        res_start = client.post(f"/stage/rooms/{r_id}/start")
        assert res_start.status_code == 200

        # Error 404 al iniciar sala inexistente (RF-20)
        assert client.post("/stage/rooms/999/start").status_code == 404

        # Error 400 al intentar iniciar una sala que ya está LIVE (RF-20)
        assert client.post(f"/stage/rooms/{r_id}/start").status_code == 400

        # Forzar que el servidor no active temporizador asíncrono para verificar propiedades locales (RF-22)
        room = session.get(Room, r_id)
        room.timer_started_at = None
        session.add(room)
        session.commit()

        # Detener el temporizador de la sala en el servidor (RF-22)
        assert client.post(f"/stage/rooms/{r_id}/timer/stop").status_code == 200

        # Error 404 al detener temporizador en sala inexistente (RF-22)
        assert client.post("/stage/rooms/999/timer/stop").status_code == 404

        # Error 400 al finalizar sala en LIVE que no está en fase de verificación (RF-19)
        assert client.post(f"/stage/rooms/{r_id}/finish").status_code == 400

        # Finalizar sala de forma forzada para limpiar (RF-19)
        assert client.post(f"/stage/rooms/{r_id}/force-finish").status_code == 200
        assert client.get(f"/stage/rooms/{r_id}").json()["status"].upper() == "FINISHED"

        # Error 400 al intentar finalizar una sala que ya ha terminado (RF-19)
        assert client.post(f"/stage/rooms/{r_id}/finish").status_code == 400

        # Error 400 al finalizar sala inexistente (RF-19)
        assert client.post("/stage/rooms/999/finish").status_code == 400

        # Error 404 al forzar finalización de sala inexistente (RF-19)
        assert client.post("/stage/rooms/999/force-finish").status_code == 404

    def test_student_participation(self, client: TestClient, session):
        """
        HU-AL-01: Participación del estudiante (RF-16, RF-17, RF-18)
        Flujo de validación de PIN, unión a sala de espera y listado de alumnos.
        """
        q, qu1, qu2, o1, t, s = self.setup_entities(session)

        # Crear sala base para los participantes (RF-15)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        code = res_c.json()["join_code"]

        # Verificar que el PIN corresponde a una sala activa (RF-16)
        assert client.get(f"/stage/rooms/verify/{code}").status_code == 200

        # Error 404 al verificar PIN inexistente (RF-16)
        assert client.get("/stage/rooms/verify/999999").status_code == 404

        # Error 404 al intentar unir un estudiante inexistente a la sala (RF-17)
        assert client.post("/stage/participants", params={"student_id": 999, "room_id": r_id}).status_code == 404

        # Error 404 al intentar unir un estudiante a una sala inexistente (RF-17)
        assert client.post("/stage/participants", params={"student_id": s.id, "room_id": 999}).status_code == 404

        # Unirse a la sala de espera como participante (RF-17)
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        assert res_p.status_code == 200
        p_id = res_p.json()["participant_id"]

        # Unión duplicada del estudiante a la sala es idempotente y devuelve el ID existente (RF-17)
        res_p_dup = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        assert res_p_dup.status_code == 200
        assert res_p_dup.json()["participant_id"] == p_id

        # Listar participantes conectados en la sala de espera (RF-18)
        res_list = client.get(f"/stage/rooms/{r_id}/participants")
        assert len(res_list.json()) >= 1

        # Listado general de participantes para depuración (RF-18)
        client.get("/stage/participants")

        # Finalizar la sala de forma forzada para verificar PIN inactivo (RF-19)
        client.post(f"/stage/rooms/{r_id}/force-finish")
        assert client.get(f"/stage/rooms/verify/{code}").status_code == 404

    def test_interactive_quiz_execution(self, client: TestClient, session):
        """
        HU-AL-02: Ejecución de la prueba interactiva (RF-21, RF-23, RF-24)
        Flujo de progresión de preguntas, recepción de respuestas y asignación inmediata de puntos/feedback.
        """
        q, qu1, qu2, o1, t, s = self.setup_entities(session)

        # Crear sala y añadir participante (RF-15)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        p_id = res_p.json()["participant_id"]

        # Error 400 al intentar avanzar pregunta en una sala que no está LIVE (RF-21)
        assert client.patch(f"/stage/rooms/{r_id}/next-question").status_code == 400

        # Error 404 al intentar enviar respuesta con participante inexistente (RF-23)
        assert client.post("/stage/answers", params={"participant_id": 999, "option_id": o1.id, "question_id": qu1.id}).status_code == 404

        # Iniciar la sala para ponerla en LIVE (RF-20)
        client.post(f"/stage/rooms/{r_id}/start")

        # Enviar respuesta correcta a la pregunta actual (RF-23)
        res_a = client.post("/stage/answers", params={"participant_id": p_id, "option_id": o1.id, "question_id": qu1.id})
        assert res_a.status_code == 201

        # Error 400 al intentar enviar una respuesta duplicada para la misma pregunta (RF-23)
        res_a2 = client.post("/stage/answers", params={"participant_id": p_id, "option_id": o1.id, "question_id": qu1.id})
        assert res_a2.status_code == 400

        # Listar respuestas registradas para depuración (RF-23)
        client.get("/stage/answers")

        # Confirmar los puntos obtenidos de forma inmediata (RF-24)
        p = session.get(Participant, p_id)
        assert p.score == 10

        # Avanzar a la siguiente pregunta del cuestionario (RF-21)
        res_next = client.patch(f"/stage/rooms/{r_id}/next-question")
        assert res_next.status_code == 200
        assert client.get(f"/stage/rooms/{r_id}").json()["current_question_index"] == 2

        # Avanzar pregunta hasta llegar a la fase de verificación final (RF-21)
        client.patch(f"/stage/rooms/{r_id}/next-question")
        assert client.get(f"/stage/rooms/{r_id}").json()["status"].upper() == "VERIFYING"

        # Error 404 al avanzar pregunta en sala inexistente (RF-21)
        assert client.patch("/stage/rooms/999/next-question").status_code == 404

    def test_qr_based_identification(self, client: TestClient, session):
        """
        HU-AL-03: Identificación criptográfica por QR (RF-25)
        Prueba la generación del token provisional QR al colocar la sala en fase de verificación final.
        """
        q, qu1, qu2, o1, t, s = self.setup_entities(session)

        # Crear sala y añadir participante (RF-15)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        p_id = res_p.json()["participant_id"]

        # Iniciar la sala y avanzar pregunta para colocar la sala en fase de verificación final (RF-20)
        client.post(f"/stage/rooms/{r_id}/start")
        client.patch(f"/stage/rooms/{r_id}/next-question")
        client.patch(f"/stage/rooms/{r_id}/next-question")

        # Comprobar que se ha generado el token de verificación provisional de forma automática (RF-25)
        p = session.get(Participant, p_id)
        assert p.verification_token is not None

    def test_teacher_verification(self, client: TestClient, session):
        """
        HU-PR-05: Verificación presencial docente (RF-29, RF-31)
        Flujo de validación del token provisional y finalización consolidada.
        """
        q, qu1, qu2, o1, t, s = self.setup_entities(session)

        # Crear sala y añadir participante (RF-15)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        p_id = res_p.json()["participant_id"]

        # Llevar sala a fase de verificación final (RF-21)
        client.post(f"/stage/rooms/{r_id}/start")
        client.patch(f"/stage/rooms/{r_id}/next-question")
        client.patch(f"/stage/rooms/{r_id}/next-question")

        # Obtener token de verificación (RF-25)
        p = session.get(Participant, p_id)

        # Error 400 al verificar un participante con token incorrecto (RF-29)
        assert client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": s.name, "token": "invalid_token_xxxx"}).status_code == 400

        # Error 404 al verificar un participante inexistente (RF-29)
        assert client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": "nonexistent_student", "token": "any_token"}).status_code == 404

        # Verificar participante de forma correcta utilizando su nickname y token (RF-29)
        res_v = client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": s.name, "token": p.verification_token})
        assert res_v.status_code == 200

        # Finalizar la sala principal (RF-19)
        assert client.post(f"/stage/rooms/{r_id}/finish").status_code == 200

    def test_realtime_session_analytics(self, client: TestClient, session):
        """
        HU-PR-06: Analítica de sesión en tiempo real (RF-09)
        Comprueba la obtención de estadísticas del estudiante y la pantalla global de ranking.
        """
        q, qu1, qu2, o1, t, s = self.setup_entities(session)

        # Crear sala y añadir participante (RF-15)
        res_c = client.post("/stage/rooms", params={"quiz_id": q.id})
        r_id = res_c.json()["id"]
        res_p = client.post("/stage/participants", params={"student_id": s.id, "room_id": r_id})
        p_id = res_p.json()["participant_id"]

        # Iniciar la sala (RF-20)
        client.post(f"/stage/rooms/{r_id}/start")

        # Mostrar pantalla global de ranking (RF-09)
        assert client.post(f"/stage/rooms/{r_id}/leaderboard/show").status_code == 200
        assert client.get(f"/stage/rooms/{r_id}/leaderboard").status_code == 200

        # Error 404 al mostrar ranking en sala inexistente (RF-09)
        assert client.post("/stage/rooms/999/leaderboard/show").status_code == 404

        # Llevar sala a fase de verificación final (RF-21)
        client.patch(f"/stage/rooms/{r_id}/next-question")
        client.patch(f"/stage/rooms/{r_id}/next-question")

        # Obtener token de verificación y verificar (RF-29)
        p = session.get(Participant, p_id)
        client.post(f"/stage/rooms/{r_id}/verify-participant", json={"nickname": s.name, "token": p.verification_token})

        # Obtener estadísticas de rendimiento de la participación verificada (RF-09)
        res_stats = client.get(f"/stage/rooms/{r_id}/participants/{p_id}/stats")
        assert res_stats.status_code == 200

        # Error 404 al obtener estadísticas de un participante en sala inexistente (RF-09)
        assert client.get(f"/stage/rooms/999/participants/{p_id}/stats").status_code == 404


    def test_live_room_timer_sync(self, client: TestClient, session):
        """
        HU-PR-04: Sincronización del temporizador de la sala en tiempo real (RF-22)
        Verificación del bucle de sincronización técnica del temporizador en el servidor.
        """
        # Crear sala para lógica de sincronización del temporizador (RF-15)
        room = Room(quiz_id=None, join_code="WS_TIME", status=RoomStatus.LIVE, teacher_id=1, is_paused=True, remaining_time_at_pause=10, answer_time=30)
        session.add(room)
        session.commit()

        # Ejecutar iteración del bucle de sincronización del temporizador del servidor (RF-22)
        async def run_once():
            task = asyncio.create_task(timer_sync_loop())
            await asyncio.sleep(1.5)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        asyncio.run(run_once())

    def test_websocket_connection_and_broadcasting(self, client: TestClient, session):
        """
        HU-AL-01: Gestión de conexiones en tiempo real (RF-40)
        Verificación de la conexión al WebSocket de la sala y gestión de desconexiones o errores de difusión.
        """
        # Crear sala para pruebas de conexión por WebSocket (RF-15)
        room = Room(quiz_id=None, join_code="WS_CONN", status=RoomStatus.LIVE, teacher_id=1, is_paused=True, remaining_time_at_pause=10, answer_time=30)
        session.add(room)
        session.commit()

        # Conectar al WebSocket de la sala con rol de profesor (RF-40)
        with client.websocket_connect(f"/stage/rooms/{room.id}/ws?role=teacher") as ws:
            pass

        # Provocar excepción en la conexión del ConnectionManager para cobertura (RF-40)
        manager.active_connections[room.id] = [type('F', (), {'send_json': lambda x: exec('raise Exception()')})()]
        asyncio.run(manager.broadcast_to_room(room.id, {"t": "p"}))
