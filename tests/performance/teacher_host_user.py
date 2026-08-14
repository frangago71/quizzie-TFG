import random
from locust import HttpUser, task, between

class TeacherHostUser(HttpUser):
    """
    Simula profesores con salas de juego activas en vivo (2% del tráfico).
    """
    weight = 2
    wait_time = between(1, 3)
    token = None
    quiz_id = None
    room_id = None

    def on_start(self):
        """Autentica al profesor y crea una sala de prueba en vivo."""
        login_res = self.client.post("/users/login", json={
            "email": "cervantes@quizzie.com",
            "password": "123456"
        }, name="/users/login")

        if login_res.status_code == 200:
            self.token = login_res.json().get("access_token")

        # Obtener un quiz para crear sala
        quizzes_res = self.client.get("/content/quizzes/", name="/content/quizzes/")
        if quizzes_res.status_code == 200 and quizzes_res.json():
            self.quiz_id = quizzes_res.json()[0].get("id")

        if self.token and self.quiz_id:
            headers = {"Authorization": f"Bearer {self.token}"}
            room_res = self.client.post(
                f"/stage/rooms/?quiz_id={self.quiz_id}",
                headers=headers,
                name="/stage/rooms/"
            )
            if room_res.status_code in [200, 201]:
                self.room_id = room_res.json().get("id")

    @task(3)
    def check_room_status(self):
        """Consulta el estado de la sala activa."""
        if self.room_id:
            self.client.get(f"/stage/rooms/{self.room_id}", name="/stage/rooms/{id}")

    @task(2)
    def check_participants(self):
        """Consulta los participantes conectados a la sala."""
        if self.room_id:
            self.client.get(f"/stage/rooms/{self.room_id}/participants", name="/stage/rooms/{id}/participants")

    @task(2)
    def control_game_flow(self):
        """Simula la transición de estado de la sala por parte del profesor."""
        if not self.room_id or not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}

        # 1. Iniciar sala
        with self.client.post(f"/stage/rooms/{self.room_id}/start", headers=headers, name="/stage/rooms/{id}/start", catch_response=True) as res:
            if res.status_code in [200, 400]:
                res.success()

        # 2. Avanzar pregunta
        with self.client.patch(f"/stage/rooms/{self.room_id}/next-question", headers=headers, name="/stage/rooms/{id}/next-question", catch_response=True) as res:
            if res.status_code in [200, 400]:
                res.success()

        # 3. Mostrar resultados y leaderboard
        with self.client.post(f"/stage/rooms/{self.room_id}/leaderboard/show", headers=headers, name="/stage/rooms/{id}/leaderboard/show", catch_response=True) as res:
            if res.status_code in [200, 400]:
                res.success()
