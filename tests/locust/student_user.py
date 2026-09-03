import json
import time
import random
from urllib.parse import urlparse
from locust import HttpUser, task, between, events
import gevent
from websocket import create_connection, WebSocketException, WebSocketTimeoutException

class StudentUser(HttpUser):
    """
    Simula alumnos repartidos en salas activas respondiendo en tiempo real (95% del tráfico).
    """
    weight = 95
    wait_time = between(2, 5)

    room_id = 1
    participant_id = None
    ws = None
    listen_greenlet = None

    def on_start(self):
        """Conecta al alumno a una sala activa y registra el listener de eventos."""
        self.participant_id = random.randint(1, 10000)
        self.room_id = random.choice([1, 2, 3])

        host = self.host or "http://127.0.0.1:8000"
        parsed = urlparse(host)
        ws_scheme = "ws" if parsed.scheme in ["http", "ws", ""] else "wss"
        netloc = parsed.netloc or "127.0.0.1:8000"
        ws_url = f"{ws_scheme}://{netloc}/stage/rooms/{self.room_id}/ws?role=student"

        start_time = time.time()
        try:
            self.ws = create_connection(ws_url, timeout=3)
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="WebSocket",
                name="WS Connect",
                response_time=total_time,
                response_length=0,
                exception=None,
            )
            # Iniciar greenlet de escucha en segundo plano
            self.listen_greenlet = gevent.spawn(self._listen)
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="WebSocket",
                name="WS Connect",
                response_time=total_time,
                response_length=0,
                exception=e,
            )
            self.ws = None

    def _listen(self):
        """Greenlet que escucha mensajes del WebSocket en tiempo real."""
        while self.ws:
            try:
                self.ws.settimeout(1.0)
                start_time = time.time()
                data_str = self.ws.recv()
                total_time = int((time.time() - start_time) * 1000)
                if not data_str:
                    break

                payload = json.loads(data_str)
                event_type = payload.get("type", "unknown")

                events.request.fire(
                    request_type="WebSocket",
                    name=f"WS Receive: {event_type}",
                    response_time=total_time,
                    response_length=len(data_str),
                    exception=None,
                )

                # Si llega una nueva pregunta, enviar respuesta de alumno
                if event_type in ["next_question", "room_start"]:
                    q_data = payload.get("data", {})
                    question_id = q_data.get("question_id", 1)
                    self._submit_answer(question_id)

            except WebSocketTimeoutException:
                continue
            except WebSocketException as wse:
                events.request.fire(
                    request_type="WebSocket",
                    name="WS Receive Error",
                    response_time=0,
                    response_length=0,
                    exception=wse,
                )
                break
            except Exception:
                break

    @task(2)
    def submit_answer_task(self):
        """Tarea periódica para simular el envío de respuestas de alumnos durante la partida."""
        question_id = random.choice([1, 2, 3, 4, 5])
        self._submit_answer(question_id)

    def _submit_answer(self, question_id):
        """Simula el envío masivo de respuesta de alumno al backend usando la API nativa de Locust."""
        option_id = random.choice([1, 2, 3, 4])
        url = f"/stage/answers?participant_id={self.participant_id}&option_id={option_id}&question_id={question_id}"
        with self.client.post(url, name="/stage/answers", catch_response=True) as res:
            if res.status_code in [200, 201, 400, 404]:
                res.success()

    @task(1)
    def keep_alive_ping(self):
        """Envía un ping periódico a la conexión WebSocket activa."""
        if self.ws:
            start_time = time.time()
            try:
                self.ws.ping()
                total_time = int((time.time() - start_time) * 1000)
                events.request.fire(
                    request_type="WebSocket",
                    name="WS Ping",
                    response_time=total_time,
                    response_length=0,
                    exception=None,
                )
            except Exception as e:
                total_time = int((time.time() - start_time) * 1000)
                events.request.fire(
                    request_type="WebSocket",
                    name="WS Ping",
                    response_time=total_time,
                    response_length=0,
                    exception=e,
                )

    def on_stop(self):
        """Cierra de forma limpia la conexión WebSocket y detiene el greenlet."""
        if self.listen_greenlet:
            self.listen_greenlet.kill()
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass
