# Estrategia de pruebas

## 1. Introducción
Este documento define el marco de aseguramiento de la calidad (QA) para el proyecto. El objetivo es garantizar la integridad de los datos, la estabilidad de la sincronización mediante WebSockets y una experiencia de usuario fluida. 

## 2. Niveles de prueba y herramientas seleccionadas

Se adopta un enfoque de "Pirámide de pruebas" para equilibrar velocidad de ejecución y confianza en el sistema:

| Nivel | Objetivo | Herramienta |
| :--- | :--- | :--- |
| **Pruebas unitarias** | Validar lógica de negocio aislada (puntuaciones, generación de PIN, validación de esquemas). | `pytest` |
| **Pruebas de componentes** | Verificar el comportamiento de la UI (React) de forma aislada. | `Vitest` + `React Testing Library` |
| **Pruebas de integración** | Verificar la comunicación entre la API, la Base de Datos y los eventos de Sockets. | `pytest` + `TestClient` |
| **Pruebas E2E** | Simular flujos completos (Profesor y Alumno) con múltiples contextos de navegador. | `Playwright` |
| **Pruebas de rendimiento** | Evaluar la estabilidad del servidor ante múltiples conexiones concurrentes. | `Locust` |

## 3. Alcance del plan de pruebas

### 3.1. Pruebas por dominio de entidad 
El plan de pruebas se organiza en suites independientes por dominio, diferenciando estrictamente entre la lógica de negocio y la infraestructura:

* **Dominio de contenido (Entidades Quiz, Question y Option):**
    * **Backend:** Validación de reglas de integridad en modelos y persistencia en DB.
    * **Frontend:** Pruebas de componentes para la renderización de preguntas y opciones.
* **Dominio de sesiones (Entidades Room, Answer y Participant):**
    * **Backend:** Lógica de estados de sala y algoritmos de generación de PIN único.
    * **Frontend:** Sincronización del estado de la sala y visualización del contador de tiempo.
* **Dominio de usuarios (Entidades Teacher y Student):**
    * **Unit/Integration:** Ciclo de registro, login y protección de rutas mediante JWT.
    * **Seguridad:** Validación de formatos de credenciales y lógica de roles.

### 3.2. Interacción en tiempo real y sockets 
* **Sincronización:** Pruebas de integración para la actualización en tiempo real de la lista de participantes y estados de espera.
* **Motor de Juego:** Verificación de la emisión de preguntas y recepción masiva de eventos bajo el protocolo WebSocket.

### 3.3. Seguridad, verificación y estadísticas 
* **Verificación QR:** Tests unitarios para la lógica de validación de tokens y tests de integración para el acceso autenticado mediante escaneo.
* **Detección de Fraude:** Validación de triggers y alertas ante pérdida de foco o comportamientos sospechosos en el cliente.
* **Analítica:** Validación de la integridad de los cálculos estadísticos (Unitario) y de la correcta generación de archivos de exportación (CSV/Excel).

## 4. Pruebas de rendimiento y carga (Locust)
Dada la alta densidad de requisitos de tiempo real (especialmente RF-21 y RF-32), las pruebas de carga son críticas:
* **Escenario de carga:** Simulación de una clase estándar (60 alumnos) respondiendo al unísono.
* **Escenario de estrés:** Identificación del límite de conexiones concurrentes antes de degradar la latencia.
* **Métricas:** Tiempo de respuesta (latencia de socket) y tasa de error en la recepción de respuestas masivas.

## 5. Métricas de cobertura (Coverage)
Se utilizará **`pytest-cov`** para cuantificar la calidad del código:
* **Objetivos de cobertura:** 
    * Mínimo del **90% en las rutas** (API endpoints).
    * Mínimo del **80% del total del código backend**.
* **Control de regresión:** Cada nueva funcionalidad debe incluir sus propios tests para no bajar la métrica global.

## 6. Automatización y CI/CD (GitHub Actions)
La suite de pruebas se ejecutará automáticamente bajo las siguientes condiciones:
* **Push/Pull Request a `main` y `develop`**.
* **Fallo Crítico:** Si un test falla o la cobertura cae, se bloqueará el despliegue automático hacia producción.

## 7. Entorno de Ejecución e Infraestructura
* **Aislamiento de Datos:** Las pruebas se ejecutan contra una base de datos SQLite en memoria o una base de datos PostgreSQL temporal para garantizar la independencia de los resultados.
* **Backend:** Gestión de entorno y dependencias mediante **uv** (Python 3.12+).
* **Frontend:** Navegadores gestionados por Playwright (emulación móvil para alumnos) y Vitest para componentes.
* **CI/CD:** Runners de GitHub Actions utilizando `setup-uv` y acciones oficiales de Playwright.

