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
    Flujo:
    1) Se unen a la sala activa del cuestionario.
    2) Escuchan el inicio y avance de preguntas vía WebSocket.
    3) Responden de manera repartida dentro del tiempo EXACTAMENTE una sola vez por cada pregunta con opciones válidas.
    """
    weight = 95
    wait_time = between(2, 5)

    room_id = 1
    participant_id = None
    current_question_id = None
    current_options = None
    ws = None
    listen_greenlet = None

    def on_start(self):
        """Conecta al alumno a la sala activa, vincula su participante y abre el WebSocket de eventos."""
        self.current_options = []
        self.answered_question_ids = set()

        # Pequeño retardo escalonado para no saturar SQLite en el mismo milisegundo durante el spawn
        gevent.sleep(random.uniform(0.05, 0.3))

        # 1. Distribuir a los alumnos entre las salas activas
        active_room_ids = []
        try:
            rooms_res = self.client.get("/stage/rooms", name="/stage/rooms")
            if rooms_res.status_code == 200 and rooms_res.json():
                active_room_ids = [
                    r.get("id")
                    for r in rooms_res.json()
                    if r.get("status") in ["waiting", "live"]
                ]
        except Exception:
            pass

        if active_room_ids:
            self.room_id = random.choice(active_room_ids)
        else:
            self.room_id = random.choice([1, 2, 3])

        # 2. Vincular el estudiante a la sala -> Trazabilidad Estudiante + Sala -> Participante
        student_id = random.randint(1, 40)
        with self.client.post(
            f"/stage/participants?student_id={student_id}&room_id={self.room_id}",
            name="/stage/participants",
            catch_response=True,
        ) as join_res:
            if join_res.status_code in [200, 201]:
                data = join_res.json()
                self.participant_id = data.get("participant_id")
                join_res.success()
            elif join_res.status_code in [400, 404]:
                # Sala cerrada, en finalización o no encontrada: comportamiento esperado del juego
                join_res.success()
                self.participant_id = student_id
            else:
                join_res.failure(f"HTTP {join_res.status_code}: {join_res.text}")
                self.participant_id = student_id

        # 3. Conexión WebSocket para recibir los eventos en vivo de la sala
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

        try:
            room_res = self.client.get(f"/stage/rooms/{self.room_id}", name="/stage/rooms/{id}")
            if room_res.status_code == 200:
                r_data = room_res.json()
                q_id = r_data.get("question_id")
                options = r_data.get("options", [])
                opt_ids = [opt.get("id") for opt in options if isinstance(opt, dict) and "id" in opt]
                if q_id and opt_ids and q_id not in self.answered_question_ids and r_data.get("status") == "live":
                    self.answered_question_ids.add(q_id)
                    self.current_question_id = q_id
                    self.current_options = opt_ids
                    gevent.sleep(random.uniform(0.1, 0.5))
                    option_id = random.choice(opt_ids)
                    self._submit_answer(q_id, option_id)
        except Exception:
            pass

    def _listen(self):
        """Greenlet que escucha eventos WebSocket (room_start, next_question) y responde repartido una sola vez por pregunta."""
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

                # Cuando el profesor inicia la sala o avanza pregunta, responder dentro del tiempo (1 sola vez)
                if event_type in ["next_question", "room_start"]:
                    q_data = payload.get("data", {})
                    q_id = q_data.get("question_id")
                    options = q_data.get("options", [])
                    opt_ids = [
                        opt.get("id") for opt in options if isinstance(opt, dict) and "id" in opt
                    ]
                    if q_id and opt_ids and q_id not in self.answered_question_ids:
                        # Marcar inmediatamente como respondida para evitar cualquier duplicidad
                        self.answered_question_ids.add(q_id)
                        self.current_question_id = q_id
                        self.current_options = opt_ids
                        # Tiempo de lectura y respuesta repartido entre alumnos
                        gevent.sleep(random.uniform(0.1, 0.8))
                        option_id = random.choice(opt_ids)
                        self._submit_answer(q_id, option_id)

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

    def _submit_answer(self, question_id, option_id):
        """Envía la respuesta al backend asegurando que option pertenezca estrictamente a question."""
        if not self.participant_id or not question_id or not option_id:
            return

        url = f"/stage/answers?participant_id={self.participant_id}&option_id={option_id}&question_id={question_id}"
        with self.client.post(url, name="/stage/answers", catch_response=True) as res:
            if res.status_code in [200, 201]:
                res.success()
            elif res.status_code == 400 and "Ya has respondido" in res.text:
                res.success()
            else:
                res.failure(f"HTTP {res.status_code}: {res.text}")

    @task(1)
    def keep_alive_ping(self):
        """Envía un ping periódico a la conexión WebSocket activa mientras espera eventos."""
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
