import random
from locust import HttpUser, task, between

class TeacherManagerUser(HttpUser):
    """
    Simula profesores gestionando cuestionarios, creando/editando contenido y explorando (3% del tráfico).
    """
    weight = 3
    wait_time = between(2, 5)

    token = None
    quiz_id = None

    def on_start(self):
        """Prepara el usuario profesor autenticado con credenciales del seed."""
        login_payload = {
            "email": "cervantes@quizzie.com",
            "password": "123456",
        }
        with self.client.post("/users/login", json=login_payload, name="/users/login", catch_response=True) as login_res:
            if login_res.status_code == 200:
                data = login_res.json()
                self.token = data.get("access_token")
                login_res.success()
            else:
                fallback = self.client.post("/users/login", json={"email": "alonso@quizzie.com", "password": "123456"}, name="/users/login")
                if fallback.status_code == 200:
                    self.token = fallback.json().get("access_token")

    @task(3)
    def get_profile(self):
        """Consulta el perfil del usuario autenticado."""
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get("/users/me", headers=headers, name="/users/me")

    @task(4)
    def get_quizzes(self):
        """Consulta el catálogo de cuestionarios."""
        res = self.client.get("/content/quizzes/", name="/content/quizzes/")
        if res.status_code == 200:
            quizzes = res.json()
            if quizzes and isinstance(quizzes, list):
                self.quiz_id = random.choice(quizzes).get("id")

    @task(3)
    def get_quiz_details(self):
        """Consulta el detalle de un cuestionario específico."""
        if self.quiz_id:
            self.client.get(f"/content/quizzes/{self.quiz_id}", name="/content/quizzes/{id}")

    @task(2)
    def create_quiz(self):
        """Simula la creación de un nuevo cuestionario por parte de un profesor."""
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "title": f"Quiz Benchmark {random.randint(100, 999)}",
            "description": "Cuestionario creado durante la prueba de rendimiento de Locust",
            "questions": [
                {
                    "text": "¿Pregunta de prueba de rendimiento?",
                    "points": 10,
                    "options": [
                        {"text": "Opción A (Correcta)", "is_correct": True},
                        {"text": "Opción B", "is_correct": False}
                    ]
                }
            ]
        }
        with self.client.post("/content/quizzes/", json=payload, headers=headers, name="/content/quizzes/", catch_response=True) as res:
            if res.status_code in [200, 201]:
                res.success()
                data = res.json()
                if "quiz_id" in data:
                    self.quiz_id = data["quiz_id"]

    @task(2)
    def edit_quiz(self):
        """Simula la edición de un cuestionario existente por parte de un profesor."""
        if not self.token or not self.quiz_id:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "title": f"Quiz Editado {random.randint(100, 999)}",
            "description": "Descripción actualizada durante prueba de rendimiento",
            "questions": [
                {
                    "text": "¿Pregunta editada de prueba?",
                    "points": 15,
                    "options": [
                        {"text": "Opción 1 Editada", "is_correct": True},
                        {"text": "Opción 2 Editada", "is_correct": False}
                    ]
                }
            ]
        }
        with self.client.put(f"/content/quizzes/{self.quiz_id}", json=payload, headers=headers, name="/content/quizzes/{id}", catch_response=True) as res:
            if res.status_code in [200, 201, 403, 404]:
                res.success()


    @task(1)
    def join_room_by_code(self):
        """Simula la consulta de PIN/Código de sala."""
        test_code = "123456"
        with self.client.get(f"/stage/code/{test_code}", name="/stage/code/{join_code}", catch_response=True) as res:
            if res.status_code in [200, 404]:
                res.success()
