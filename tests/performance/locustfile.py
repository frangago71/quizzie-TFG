from locust import events
from tests.performance.teacher_manager_user import TeacherManagerUser
from tests.performance.teacher_host_user import TeacherHostUser
from tests.performance.student_user import StudentWSUser

# Definición de clases expuestas para Locust con sus ponderaciones
__all__ = ["TeacherManagerUser", "TeacherHostUser", "StudentWSUser"]

@events.init.add_listener
def on_locust_init(environment, **_kwargs):
    """Muestra información inicial del escenario ajustado."""
    print("\n==========================================================================")
    print("=== Suite de pruebas de carga y estrés con distribución realista ===")
    print(" - 3% TeacherManagerUser (Gestión de cuestionarios)")
    print(" - 2% TeacherHostUser (Profesores con salas de juego activas)")
    print(" - 95% StudentUser (Alumnos conectados en vivo vía WebSockets)")
    print("==========================================================================\n")
