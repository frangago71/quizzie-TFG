# Estrategia de pruebas

## 1. Introducción
Este documento define el marco de aseguramiento de la calidad (QA) para el proyecto. El objetivo es garantizar la integridad de los datos, la estabilidad de la sincronización mediante WebSockets y una experiencia de usuario fluida.

## 2. Niveles de prueba y herramientas seleccionadas

Se adopta un enfoque de "Pirámide de pruebas" para equilibrar velocidad de ejecución y confianza en el sistema, separando las herramientas de ejecución de pruebas de las herramientas de análisis de cobertura:

### 2.1. Herramientas de ejecución de pruebas

| Nivel | Objetivo | Herramienta principal |
| :--- | :--- | :--- |
| **Pruebas unitarias (Backend)** | Validar lógica de negocio aislada (puntuaciones, generación de PIN, esquemas). | `pytest` |
| **Pruebas de componentes (Frontend)** | Verificar el comportamiento de la UI (React) de forma aislada. | `Vitest` + `React Testing Library` |
| **Pruebas de integración** | Verificar la comunicación entre API, Base de Datos y WebSockets. | `pytest` + `TestClient` |
| **Pruebas E2E** | Simular flujos completos (Profesor y Alumno) con navegación real. | `Playwright` |
| **Pruebas de rendimiento** | Evaluar la estabilidad del servidor ante conexiones masivas concurrentes. | `Locust` |

### 2.2. Herramientas de análisis de cobertura (Coverage)

| Capa / Nivel | Herramienta de cobertura | Alcance / Módulos acotados |
| :--- | :--- | :--- |
| **Backend (Unitario/Integración)** | `pytest-cov` | Código backend (`backend/`), excluyendo scripts de desarrollo (`seed.py`). |
| **Frontend - Componentes** | `@vitest/coverage-v8` | Módulos funcionales principales del frontend (`src/auth`, `src/management`, `src/room-access`, `src/room-play`). |
| **Frontend - E2E** | `monocart-coverage-reports` | Cobertura V8 nativa sobre build de producción del frontend, delimitada a los módulos funcionales principales (`src/auth`, `src/management`, `src/room-access`, `src/room-play`). |

## 3. Alcance del plan de pruebas

### 3.1. Pruebas unitarias y de integración por módulos y etapas
Las pruebas unitarias y de integración se estructuran por **módulos** y se organizan internamente según las **etapas del ciclo de vida del proyecto**, garantizando una trazabilidad completa con el diseño y los requisitos:

* **Organización modular unificada (`tests/`):** La totalidad de las pruebas del sistema se encuentra centralizada en la carpeta raíz `tests/`, subdividida en cuatro áreas especializadas:
  * **`tests/backend/`:** Pruebas unitarias y de integración del backend (`contenido`, `sesiones` y `usuarios`).
  * **`tests/frontend/`:** Pruebas de componentes de la interfaz de usuario en React.
  * **`tests/e2e/`:** Pruebas de extremo a extremo con Playwright basadas en Casos de Uso.
  * **`tests/locust/`:** Pruebas de carga, rendimiento y concurrencia.

* **División por etapas (dentro de las suites de backend):** Dentro de cada uno de los archivos de prueba de los módulos del backend, los tests se agrupan y estructuran según la fase de desarrollo correspondiente:
  * **MVP:** Funcionalidad mínima esencial (por ejemplo: login básico, creación de cuestionario simple, entrada a sala).
  * **Core:** Lógica de negocio principal y flujos estándar (por ejemplo: sincronización de juego, juego en vivo, estadísticas).
  * **Final Release:** Características avanzadas, optimizaciones, seguridad reforzada y control de errores del entregable final.

* **Trazabilidad:**
  * **Pruebas unitarias:** Tienen trazabilidad directa con los **Requisitos Funcionales (RF)**.
  * **Pruebas de integración:** Tienen trazabilidad directa con las **Historias de Usuario (HU)**.
  * **Pruebas E2E:** Tienen trazabilidad directa con los **Casos de Uso (CU)**.

### 3.2. Interacción en tiempo real y sockets
* **Sincronización:** Pruebas de integración para la actualización en tiempo real de la lista de participantes y estados de espera.
* **Motor de juego:** Verificación de la emisión de preguntas y recepción masiva de eventos bajo el protocolo WebSocket.

### 3.3. Seguridad, verificación y estadísticas
* **Verificación QR:** Tests unitarios para la lógica de validación de tokens y tests de integración para el acceso autenticado mediante escaneo.
* **Detección de fraude:** Validación de triggers y alertas ante pérdida de foco o comportamientos sospechosos en el cliente.
* **Analítica:** Validación de la integridad de los cálculos estadísticos (Unitario) y de la correcta generación de archivos de exportación (CSV/Excel).

## 4. Pruebas de rendimiento y carga (Locust)
Dada la alta densidad de requisitos en tiempo real, las pruebas de carga y estrés son críticas para garantizar el comportamiento estable del pool de conexiones a la base de datos y la retransmisión masiva mediante WebSockets.

### 4.1. Escenarios de simulación y distribución realista de usuarios

El conjunto de pruebas de rendimiento se implementa en Python con **Locust** (`tests/locust/`). La simulación estándar por defecto evalúa **200 usuarios virtuales simultáneos** incorporados a una tasa de **15 usuarios/segundo** durante **1 minuto** de ejecución continua. Por cada conjunto de usuarios, se aplica la siguiente distribución realista:

1. **`TeacherManagerUser` (3%)**:
   * **Alcance:** Profesores gestionando su contenido, explorando sus cuestionarios y consultando su perfil.
   * **Objetivo:** Simular la carga ligera constante de gestión de contenido.

2. **`TeacherHostUser` (2%)**:
   * **Alcance:** Profesores administrando salas de juego activas en vivo.
   * **Objetivo:** Simular la creación de salas, inicio de partidas, avance de preguntas y despliegue del leaderboard.

3. **`StudentUser` (95%)**:
   * **Alcance:** Alumnos conectados mediante WebSockets persistentemente, repartidos entre las salas de juego activas.
   * **Comportamiento:** Escucha eventos de retransmisión, mantiene la conexión mediante pings y envía respuestas a las preguntas del cuestionario en tiempo real.
   * **Objetivo:** Evaluar la latencia de WebSockets y verificar la capacidad del backend para procesar respuestas masivas concurrentes sin bloqueos.

### 4.2. Métricas de evaluación y umbrales objetivo

| Métrica | Umbral Objetivo / Criterio de Éxito |
| :--- | :--- |
| **Tasa de Errores Global (Error Rate)** | `< 1.0 %` en ejecuciones continuas de 200 usuarios concurrentes. |
| **Latencia P95 (REST API Lectura/Escritura)** | `<= 200 ms` para endpoints de cuestionarios, salas y envío de respuestas (`POST /stage/answers`). |
| **Latencia P95 (Autenticación - Bcrypt)** | `<= 500 ms` en `POST /users/login` (debido al cómputo intencionado de hashing de claves contra fuerza bruta). |
| **Latencia P95 (Conexión WebSocket)** | `<= 200 ms` para el establecimiento de conexiones persistentes (`WS Connect`). |
| **Picos de Respuestas (`POST /stage/answers`)** | `<= 200 ms` durante ráfagas sostenidas de respuestas masivas simultáneas. |

> **Nota:** **Percentil 95 (P95)** indica que el 95% de las peticiones procesadas por el servidor obtienen un tiempo de respuesta igual o inferior al valor umbral especificado.


## 5. Métricas de cobertura (Coverage)
Se utilizan herramientas automáticas para cuantificar y auditar el nivel de cobertura en cada capa del sistema:

### 5.1. Backend - Pruebas unitarias e integración (`pytest-cov`)
* **Objetivos de cobertura:**
    * Mínimo del **90% en las rutas** (API endpoints).
    * Mínimo del **80% del total del código backend** (excluyendo scripts de desarrollo como `seed.py`).

### 5.2. Frontend - Pruebas de componentes (`Vitest`)
* **Módulos acotados:** Delimitados a los 4 módulos funcionales principales del cliente web (`src/auth`, `src/management`, `src/room-access` y `src/room-play`).
* **Umbrales requeridos (*thresholds*):**
    * **80%** en líneas (`lines`).
    * **80%** en funciones (`functions`).
    * **80%** en sentencias (`statements`).
    * **75%** en ramas (`branches`).

### 5.3. Frontend - Pruebas E2E (`Playwright`)
* **Módulos acotados:** Delimitados a los 4 módulos funcionales principales del cliente web (`src/auth`, `src/management`, `src/room-access` y `src/room-play`), enfocados en pantallas y vistas navegables completas.
* **Exclusión de componentes modales:** Los diálogos y ventanas modales de interfaz (como `LogoutModal.tsx`, `DeleteQuizModal.tsx` o `ScannerModal.tsx`) se prueban a nivel unitario y de componentes con `Vitest` + `React Testing Library`, quedando excluidos de la métrica E2E de `monocart-coverage-reports`. Esto evita distorsiones en la cobertura V8 causadas por guardas de renderizado condicional (`return null` cuando el modal está cerrado) y centra el E2E en las vistas principales.
* **Objetivos de cobertura:** Mismos umbrales de referencia que las pruebas de componentes (80% en líneas, funciones y sentencias; 75% en ramas).

## 6. Automatización y CI/CD (GitHub Actions)
La suite de pruebas se ejecutará automáticamente bajo las siguientes condiciones:
* **Push/Pull Request a `main` y `develop`**.
* **Fallo Crítico:** Si un test falla o la cobertura cae, se bloqueará el despliegue automático hacia producción.

## 7. Entorno de ejecución e infraestructura
* **Aislamiento de datos:** Las pruebas se ejecutan contra una base de datos SQLite en memoria o una base de datos PostgreSQL temporal para garantizar la independencia de los resultados.
* **Backend:** Gestión de entorno y dependencias mediante **uv** (Python 3.12+).
* **Frontend:** Navegadores gestionados por Playwright (emulación móvil para alumnos) y Vitest para componentes.
* **CI/CD:** Runners de GitHub Actions utilizando `setup-uv` y acciones oficiales de Playwright.
