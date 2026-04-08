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

### 3.1. Pruebas por dominio de entidad 
El plan de pruebas se organiza en suites independientes por dominio, diferenciando estrictamente entre la lógica de negocio y la infraestructura:

* **Dominio de contenido (Entidades Quiz, Question y Option):**
    * **Unit Testing:** Validación de reglas de integridad en modelos y consistencia de valores por defecto.
    * **Integration Testing:** Verificación de endpoints REST, validación de esquemas JSON de entrada (Pydantic) y persistencia real en base de datos.
* **Dominio de sesiones (Entidades Room, Answer y Participant):**
    * **Unit Testing:** Lógica de estados de sala y algoritmos de generación de PIN único.
    * **Integration Testing:** Gestión de peticiones de creación de sala y flujo de almacenamiento de respuestas de alumnos.
* **Dominio de usuarios (Entidades Teacher, Room y Student):**
    * **Unit Testing:** Validación de formatos de credenciales y lógica de roles de usuario.
    * **Integration Testing:** Ciclo de registro, login y verificación de protección de rutas mediante JWT.

### 3.2. Interacción en tiempo real y sockets 
* **Sincronización:** Pruebas de integración para la actualización en tiempo real de la lista de participantes y estados de espera.
* **Motor de Juego:** Verificación de la emisión de preguntas y recepción masiva de eventos bajo el protocolo WebSocket.

### 3.3. Seguridad, verificación, IA y estadísticas 
* **Verificación QR:** Tests unitarios para la lógica de validación de tokens y tests de integración para el acceso autenticado mediante escaneo.
* **Detección de Fraude:** Validación de triggers y alertas ante pérdida de foco o comportamientos sospechosos en el cliente.
* **Asistente IA:** Verificación de la coherencia, formato y tipado de los JSON generados automáticamente por el modelo de lenguaje.
* **Analítica:** Validación de la integridad de los cálculos estadísticos (Unitario) y de la correcta generación de archivos de exportación (CSV/Excel).

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