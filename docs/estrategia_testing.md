# Estrategia de pruebas

## 1. Introducción
Este documento define el marco de aseguramiento de la calidad (QA) para el proyecto. El objetivo es garantizar la integridad de los datos, la estabilidad de la sincronización mediante WebSockets y una experiencia de usuario fluida. 

## 2. Niveles de prueba y herramientas seleccionadas

Se adopta un enfoque de "Pirámide de pruebas" para equilibrar velocidad de ejecución y confianza en el sistema:

| Nivel | Objetivo | Herramienta |
| :--- | :--- | :--- |
| **Pruebas unitarias** | Validar lógica de negocio aislada (puntuaciones, generación de PIN, validación de esquemas). | `pytest` |
| **Pruebas de integración** | Verificar la comunicación entre la API, la Base de Datos y los eventos de Sockets. | `pytest` + `TestClient` |
| **Pruebas E2E** | Simular flujos completos de usuario en navegadores reales (Profesor y Alumno). | `Playwright` |
| **Pruebas de rendimiento** | Evaluar la estabilidad del servidor ante múltiples conexiones concurrentes. | `Locust` |

## 3. Alcance del plan de pruebas

### 3.1. Gestión y persistencia (OBJ-01, OBJ-02, OBJ-11)
* **Validación de Cuestionarios:** Verificación de campos obligatorios y tipos de datos en los JSON de entrada.
* **Persistencia:** Confirmación del ciclo de vida del dato (Crear -> Guardar -> Recuperar).
* **Acceso:** Validación de credenciales y protección de rutas.

### 3.2. Interacción en tiempo real (OBJ-03, OBJ-04, OBJ-05)
* **Gestión de Salas:** Validación de generación de PIN único y control de acceso de estudiantes.
* **Sincronización:** Actualización en tiempo real de la lista de espera y estados del juego vía Sockets.
* **Motor de Juego:** Verificación de la emisión de preguntas y recepción masiva de respuestas.

### 3.3. Seguridad, verificación, IA y estadísticas (OBJ-06, OBJ-07, OBJ-08, OBJ-09, OBJ-10, OBJ-12)
* **Verificación QR:** Tests para el flujo de escaneo y validación de identidad del alumno.
* **Detección de Fraude:** Validación de alertas ante pérdida de foco o comportamientos sospechosos.
* **Asistente IA:** Verificación de la coherencia en la generación automática de preguntas.
* **Analítica:** Validación de la integridad de los datos en las exportaciones (CSV/Excel).

## 4. Pruebas de rendimiento y carga (Locust)
Dada la alta densidad de requisitos de tiempo real (especialmente RF-21 y RF-32), las pruebas de carga son críticas:
* **Escenario de carga:** Simulación de una clase estándar (60 alumnos) respondiendo al unísono.
* **Escenario de estrés:** Identificación del límite de conexiones concurrentes antes de degradar la latencia.
* **Métricas:** Tiempo de respuesta (latencia de socket) y tasa de error en la recepción de respuestas masivas.

## 5. Métricas de cobertura (Coverage)
Se utilizará **`pytest-cov`** para cuantificar la calidad del código:
* **Objetivo de cobertura:** Mantener un mínimo del **80% de líneas ejecutadas** en el backend.
* **Control de regresión:** Cada nueva funcionalidad debe incluir sus propios tests para no bajar la métrica global.

## 6. Automatización y CI/CD (GitHub Actions)
La suite de pruebas se ejecutará automáticamente bajo las siguientes condiciones:
* **Push/Pull Request a `main` y `develop`**.
* **Fallo Crítico:** Si un test falla o la cobertura cae, se bloqueará el despliegue automático hacia producción.

## 7. Entorno de Ejecución
* **Backend:** Gestión de entorno y dependencias mediante **uv** (Python 3.x).
* **Frontend:** Navegadores gestionados por Playwright (emulación móvil para alumnos).
* **Infraestructura:** Runners de GitHub Actions (Ubuntu-latest) utilizando `setup-uv` para una integración continua ultrarrápida.