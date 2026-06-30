import pytest
from fastapi.testclient import TestClient
from models.users import Teacher
from models.content import Quiz, Question, Option
from models.stage import Room, RoomStatus
from auth import create_access_token

class TestContentIntegration:
    def setup_teacher(self, session):
        teacher = Teacher(username="t_quiz", email="tq@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        return teacher, {"Authorization": f"Bearer {token}"}

    def setup_entities(self, session):
        teacher = Teacher(username="t_ques", email="tqe@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        quiz = Quiz(title="Quiz Question", description="Desc", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        headers = {"Authorization": f"Bearer {token}"}
        return teacher, quiz, headers

    def setup_option_entities(self, session):
        teacher = Teacher(username="t_opt", email="to@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        quiz = Quiz(title="Quiz Option", description="Desc", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()
        question = Question(text="Q1", quiz_id=quiz.id, points=10)
        session.add(question)
        session.commit()
        token = create_access_token(data={"sub": str(teacher.id)})
        headers = {"Authorization": f"Bearer {token}"}
        return teacher, question, headers

    # ==========================================
    # MVP
    # ==========================================

    def test_creation_and_reading_flow(self, client: TestClient, session):
        """
        HU-PR-02. Creación manual de cuestionarios (RF-07, RF-08)
        Flujo de creación y listado de cuestionarios, preguntas y opciones de respuesta.
        """
        teacher, headers = self.setup_teacher(session)

        # Listado inicial de cuestionarios (RF-08)
        res_list_init = client.get("/content/quizzes")
        assert res_list_init.status_code == 200
        initial_count = len(res_list_init.json())

        # Crear cuestionario con preguntas y opciones integradas (RF-07)
        payload = {
            "title": "Quiz MVP Flow",
            "description": "Flow Desc",
            "questions": [
                {
                    "text": "Q1 MVP",
                    "points": 10,
                    "options": [
                        {"text": "O1 MVP", "is_correct": True},
                        {"text": "O2 MVP", "is_correct": False}
                    ]
                }
            ]
        }
        res_post = client.post("/content/quizzes", json=payload, headers=headers)
        assert res_post.status_code == 201
        quiz_id = res_post.json()["quiz_id"]

        # Listar nuevamente para comprobar la inclusión (RF-08)
        res_list_after = client.get("/content/quizzes")
        assert res_list_after.status_code == 200
        assert len(res_list_after.json()) == initial_count + 1
        assert any(q["id"] == quiz_id for q in res_list_after.json())

        # Leer por ID para verificar integridad de datos (RF-08)
        res_get = client.get(f"/content/quizzes/{quiz_id}")
        assert res_get.status_code == 200
        quiz_data = res_get.json()
        assert quiz_data["title"] == "Quiz MVP Flow"
        assert len(quiz_data["questions"]) == 1
        assert quiz_data["questions"][0]["text"] == "Q1 MVP"
        assert len(quiz_data["questions"][0]["options"]) == 2

        # Consultar listados individuales de preguntas y opciones (RF-08)
        res_questions = client.get("/content/questions")
        assert res_questions.status_code == 200
        assert any(q["text"] == "Q1 MVP" for q in res_questions.json())

        res_options = client.get("/content/options")
        assert res_options.status_code == 200
        assert any(o["text"] == "O1 MVP" for o in res_options.json())

    def test_distribution_and_checking_flow(self, client: TestClient, session):
        """
        HU-AL-02. Ejecución de la prueba interactiva (RF-21, RF-23)
        Flujo MVP de distribución de preguntas de cuestionario y verificación de opciones de respuesta.
        """
        teacher, headers = self.setup_teacher(session)
        payload = {
            "title": "Quiz Exec Flow",
            "description": "Desc",
            "questions": [
                {
                    "text": "Q1 Exec",
                    "points": 5,
                    "options": [
                        {"text": "O1 Correct", "is_correct": True},
                        {"text": "O2 Incorrect", "is_correct": False}
                    ]
                }
            ]
        }
        res_post = client.post("/content/quizzes", json=payload, headers=headers)
        quiz_id = res_post.json()["quiz_id"]

        # Simular distribución de preguntas a estudiantes (RF-21)
        res_get = client.get(f"/content/quizzes/{quiz_id}")
        assert res_get.status_code == 200
        questions = res_get.json()["questions"]
        assert len(questions) == 1
        assert questions[0]["text"] == "Q1 Exec"

        # Simular recepción de respuesta identificando la opción verdadera (RF-23)
        options = questions[0]["options"]
        correct_options = [o for o in options if o["is_correct"]]
        assert len(correct_options) == 1
        assert correct_options[0]["text"] == "O1 Correct"

    # ==========================================
    # CORE
    # ==========================================

    def test_management_editing_and_deletion_flow(self, client: TestClient, session):
        """
        HU-PR-02. Creación manual de cuestionarios (RF-13, RF-14, RF-41)
        Gestión de contenidos, incluyendo edición, borrado, listado filtrado y sus excepciones integradas cronológicamente.
        """
        teacher, headers = self.setup_teacher(session)

        # -------------------------------------------------------------
        # 1. CUESTIONARIOS (CREACIÓN, LECTURA, EDICIÓN Y SUS EXCEPCIONES)
        # -------------------------------------------------------------
        # Crear cuestionario base (RF-13)
        payload = {
            "title": "Quiz CORE Flow",
            "description": "Desc",
            "questions": [
                {
                    "text": "Q1 CORE",
                    "points": 10,
                    "options": [
                        {"text": "O1 CORE", "is_correct": True},
                        {"text": "O2 CORE", "is_correct": False}
                    ]
                }
            ]
        }
        res_post = client.post("/content/quizzes", json=payload, headers=headers)
        assert res_post.status_code == 201
        quiz_id = res_post.json()["quiz_id"]

        # Agregar pregunta temporal para borrar durante la edición (RF-13)
        q_extra = Question(text="Extra Q to Delete", points=1, quiz_id=quiz_id)
        session.add(q_extra)
        session.commit()

        # Listar cuestionarios con simulación de filtrados (RF-41)
        res_list = client.get("/content/quizzes")
        assert res_list.status_code == 200
        assert any(q["id"] == quiz_id for q in res_list.json())

        # Error 404 al buscar, actualizar o eliminar cuestionario inexistente (RF-13)
        assert client.get("/content/quizzes/999").status_code == 404
        assert client.put("/content/quizzes/999", json=payload, headers=headers).status_code == 404
        assert client.delete("/content/quizzes/999", headers=headers).status_code == 404

        # Error 400 al intentar actualizar dejándolo sin preguntas (RF-13)
        bad_payload = {"title": "Bad", "description": "d", "questions": []}
        assert client.put(f"/content/quizzes/{quiz_id}", json=bad_payload, headers=headers).status_code == 400

        # Configurar otro docente para probar permisos denegados en cuestionarios (RF-13)
        other_teacher = Teacher(username="other_auth", email="oa@o.com", hashed_password="x")
        session.add(other_teacher)
        session.commit()
        other_token = create_access_token(data={"sub": str(other_teacher.id)})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # Error 403 al intentar modificar o eliminar un cuestionario ajeno (RF-13)
        assert client.put(f"/content/quizzes/{quiz_id}", json=payload, headers=other_headers).status_code == 403
        assert client.delete(f"/content/quizzes/{quiz_id}", headers=other_headers).status_code == 403

        # Editar datos del cuestionario y asociar una pregunta totalmente nueva (RF-13)
        res_get = client.get(f"/content/quizzes/{quiz_id}")
        questions_initial = res_get.json()["questions"]
        q_id = [q["id"] for q in questions_initial if q["text"] == "Q1 CORE"][0]
        options_initial = [q["options"] for q in questions_initial if q["id"] == q_id][0]
        o_id = options_initial[0]["id"]

        update_payload = {
            "title": "Quiz CORE Updated",
            "description": "New Desc",
            "questions": [
                {
                    "id": q_id,
                    "text": "Q1 CORE Updated",
                    "points": 20,
                    "options": [
                        {"id": o_id, "text": "O1 CORE Updated", "is_correct": True},
                        {"text": "O3 New", "is_correct": False}
                    ]
                },
                {
                    "text": "Q_Brand_New",
                    "points": 5,
                    "options": [
                        {"text": "OBN 1", "is_correct": True},
                        {"text": "OBN 2", "is_correct": False}
                    ]
                }
            ]
        }
        res_put = client.put(f"/content/quizzes/{quiz_id}", json=update_payload, headers=headers)
        assert res_put.status_code == 200

        # Verificar actualización del cuestionario y borrado en cascada (RF-13)
        res_get_v2 = client.get(f"/content/quizzes/{quiz_id}")
        assert res_get_v2.json()["title"] == "Quiz CORE Updated"
        questions_v2 = res_get_v2.json()["questions"]
        assert len(questions_v2) == 2

        # -------------------------------------------------------------
        # 2. PREGUNTAS (CREACIÓN, LECTURA, BORRADO Y SUS EXCEPCIONES)
        # -------------------------------------------------------------
        # Crear pregunta individualmente (RF-13)
        q_payload = {
            "text": "Q2 New",
            "points": 5,
            "options": [
                {"text": "OA", "is_correct": True},
                {"text": "OB", "is_correct": False}
            ]
        }
        res_q_post = client.post(f"/content/quizzes/{quiz_id}/questions", json=q_payload, headers=headers)
        assert res_q_post.status_code == 200
        q2_id = res_q_post.json()["id"]

        # Leer pregunta creada individualmente (RF-13)
        res_q_get = client.get(f"/content/questions/{q2_id}")
        assert res_q_get.status_code == 200

        # Error 404 al buscar, eliminar o crear preguntas en recursos inexistentes (RF-13)
        assert client.get("/content/questions/999").status_code == 404
        assert client.delete("/content/questions/999", headers=headers).status_code == 404

        # Payload estructurado correctamente para evitar error 422 de Pydantic (RF-13)
        valid_question_payload = {
            "text": "Valid Q",
            "points": 5,
            "options": [
                {"text": "C", "is_correct": True},
                {"text": "I", "is_correct": False}
            ]
        }
        assert client.post("/content/quizzes/999/questions", json=valid_question_payload, headers=headers).status_code == 404

        # Error 403 en creación y borrado de preguntas por otro docente (RF-13)
        assert client.post(f"/content/quizzes/{quiz_id}/questions", json=valid_question_payload, headers=other_headers).status_code == 403
        assert client.delete(f"/content/questions/{q_id}", headers=other_headers).status_code == 403

        # Error 400 al intentar borrar la única pregunta de un cuestionario (RF-14)
        # Se verifica en un cuestionario temporal aislado para no alterar el flujo del test principal
        temp_payload = {
            "title": "Temp Quiz",
            "description": "Temp Desc",
            "questions": [
                {
                    "text": "T1",
                    "options": [
                        {"text": "O1", "is_correct": True},
                        {"text": "O2", "is_correct": False}
                    ]
                }
            ]
        }
        temp_quiz_id = client.post("/content/quizzes", json=temp_payload, headers=headers).json()["quiz_id"]
        temp_q_id = client.get(f"/content/quizzes/{temp_quiz_id}").json()["questions"][0]["id"]

        # Validar error 400 al borrar la única pregunta (RF-14)
        assert client.delete(f"/content/questions/{temp_q_id}", headers=headers).status_code == 400

        # -------------------------------------------------------------
        # 3. OPCIONES (CREACIÓN, LECTURA, BORRADO Y SUS EXCEPCIONES)
        # -------------------------------------------------------------
        # Crear opción individualmente (RF-13)
        opt_payload = {"text": "OC", "is_correct": False}
        res_opt_post = client.post(f"/content/questions/{q2_id}/options", json=opt_payload, headers=headers)
        assert res_opt_post.status_code == 200
        opt_new_id = res_opt_post.json()["id"]

        # Leer opción creada individualmente (RF-13)
        res_opt_get = client.get(f"/content/options/{opt_new_id}")
        assert res_opt_get.status_code == 200

        # Error 404 al buscar, eliminar o crear opciones en recursos inexistentes (RF-13)
        assert client.get("/content/options/999").status_code == 404
        assert client.delete("/content/options/999", headers=headers).status_code == 404
        assert client.post("/content/questions/999/options", json={"text": "x", "is_correct": False}, headers=headers).status_code == 404

        # Error 403 en creación y borrado de opciones por otro docente (RF-13)
        assert client.post(f"/content/questions/{q_id}/options", json={"text": "x", "is_correct": False}, headers=other_headers).status_code == 403
        assert client.delete(f"/content/options/{o_id}", headers=other_headers).status_code == 403

        # Obtener opción del cuestionario temporal para verificar sus reglas de negocio (RF-14)
        temp_o_id = client.get(f"/content/quizzes/{temp_quiz_id}").json()["questions"][0]["options"][0]["id"]

        # Error 400 al intentar borrar una opción cuando quedan solo dos en total (RF-14)
        assert client.delete(f"/content/options/{temp_o_id}", headers=headers).status_code == 400

        # Añadir una tercera opción incorrecta al cuestionario temporal para poder borrar la única opción correcta (RF-14)
        temp_opt_third = Option(text="Third Incorrect", is_correct=False, question_id=temp_q_id)
        session.add(temp_opt_third)
        session.commit()

        # Error 400 al intentar borrar la única opción correcta habiendo tres opciones en total (RF-14)
        assert client.delete(f"/content/options/{temp_o_id}", headers=headers).status_code == 400

        # Borrar la tercera opción permitida de manera exitosa (RF-14)
        res_opt_third_del = client.delete(f"/content/options/{temp_opt_third.id}", headers=headers)
        assert res_opt_third_del.status_code == 200

        # Limpiar cuestionario temporal creado para excepciones (RF-14)
        client.delete(f"/content/quizzes/{temp_quiz_id}", headers=headers)

        # -------------------------------------------------------------
        # 4. LIMPIEZA Y BORRADOS FINALES DEL CUESTIONARIO PRINCIPAL
        # -------------------------------------------------------------
        # Agregar opción correcta extra para poder cumplir la regla de borrado individual en Q2 (RF-13)
        o_correct_extra = Option(text="Correct Extra", is_correct=True, question_id=q2_id)
        session.add(o_correct_extra)
        session.commit()

        # Borrado individual de la opción creada en Q2 (RF-14)
        res_opt_del = client.delete(f"/content/options/{opt_new_id}", headers=headers)
        assert res_opt_del.status_code == 200

        # Borrado individual de la pregunta Q2 creada (RF-14)
        res_q_del = client.delete(f"/content/questions/{q2_id}", headers=headers)
        assert res_q_del.status_code == 200

        # Borrar pregunta secundaria del update (RF-14)
        q_brand_new_id = [q["id"] for q in questions_v2 if q["text"] == "Q_Brand_New"][0]
        res_del_bn = client.delete(f"/content/questions/{q_brand_new_id}", headers=headers)
        assert res_del_bn.status_code == 200

        # Borrado lógico del cuestionario completo de manera exitosa (RF-14)
        res_del = client.delete(f"/content/quizzes/{quiz_id}", headers=headers)
        assert res_del.status_code == 200

    def test_room_history_and_hard_delete_flow(self, client: TestClient, session):
        """
        HU-PR-14. Acceder al historial de salas pasadas (RF-47)
        Flujo de visualización del historial de salas y borrado físico del cuestionario con sus excepciones integradas.
        """
        teacher, headers = self.setup_teacher(session)

        # Crear cuestionario base (RF-47)
        quiz = Quiz(title="Rooms Hist Quiz", description="Desc", teacher_id=teacher.id)
        session.add(quiz)
        session.commit()

        # Consultar salas asociadas al cuestionario (RF-47)
        res = client.get(f"/content/quizzes/{quiz.id}/rooms")
        assert res.status_code == 200

        # Error 404 al buscar salas de un cuestionario inexistente (RF-47)
        assert client.get("/content/quizzes/999/rooms").status_code == 404

        # Registrar sala finalizada asociada al cuestionario (RF-47)
        room = Room(quiz_id=quiz.id, teacher_id=teacher.id, status=RoomStatus.FINISHED, join_code="OLD_ROOM")
        session.add(room)
        session.commit()

        # Error 404 al intentar realizar borrado físico de un cuestionario inexistente (RF-47)
        assert client.delete("/content/quizzes/999/hard", headers=headers).status_code == 404

        # Configurar otro docente para probar permisos en borrado físico (RF-47)
        other_teacher = Teacher(username="other_hard_ex", email="ohe@o.com", hashed_password="x")
        session.add(other_teacher)
        session.commit()
        other_token = create_access_token(data={"sub": str(other_teacher.id)})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # Error 403 al intentar realizar borrado físico de un cuestionario ajeno (RF-47)
        assert client.delete(f"/content/quizzes/{quiz.id}/hard", headers=other_headers).status_code == 403

        # Registrar sala activa para validar restricciones de borrado físico (RF-47)
        room_active = Room(quiz_id=quiz.id, teacher_id=teacher.id, status=RoomStatus.WAITING, join_code="WAIT_ROOM")
        session.add(room_active)
        session.commit()

        # Error 400 al intentar realizar borrado físico con salas activas (RF-47)
        assert client.delete(f"/content/quizzes/{quiz.id}/hard", headers=headers).status_code == 400

        # Eliminar sala activa para posibilitar el borrado definitivo (RF-47)
        session.delete(room_active)
        session.commit()

        # Borrado físico del cuestionario y sus salas finalizadas exitoso (RF-47)
        res_hard = client.delete(f"/content/quizzes/{quiz.id}/hard", headers=headers)
        assert res_hard.status_code == 200
