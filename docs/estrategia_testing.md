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

* **Organización por módulos:** Tanto las pruebas unitarias como las de integración se dividen en archivos correspondientes a cada módulo funcional principal del sistema (un archivo de pruebas específico para cada módulo):
  * **Contenido:** Gestión de cuestionarios, preguntas y opciones (`contenido`).
  * **Sesiones:** Control de salas de juego, participantes y respuestas en tiempo real (`sesiones`).
  * **Usuarios:** Registro, autenticación y gestión de profesores y alumnos (`usuarios`).

* **División por etapas (dentro de cada archivo):** Dentro de cada uno de los archivos de prueba de los módulos, los tests se agrupan y estructuran según la fase de desarrollo correspondiente:
  * **MVP:** Funcionalidad mínima esencial (por ejemplo: login básico, creación de cuestionario simple, entrada a sala).
  * **Core:** Lógica de negocio principal y flujos estándar (por ejemplo: sincronización de juego, juego en vivo, estadísticas).
  * **Final Release:** Características avanzadas, optimizaciones, seguridad reforzada y control de errores del entregable final.

* **Trazabilidad:**
  * **Pruebas unitarias:** Tienen trazabilidad directa con los **Requisitos Funcionales (RF)**.
  * **Pruebas de integración:** Tienen trazabilidad directa con las **Historias de Usuario (HU)**.

### 3.2. Interacción en tiempo real y sockets
* **Sincronización:** Pruebas de integración para la actualización en tiempo real de la lista de participantes y estados de espera.
* **Motor de juego:** Verificación de la emisión de preguntas y recepción masiva de eventos bajo el protocolo WebSocket.

### 3.3. Seguridad, verificación y estadísticas
* **Verificación QR:** Tests unitarios para la lógica de validación de tokens y tests de integración para el acceso autenticado mediante escaneo.
* **Detección de fraude:** Validación de triggers y alertas ante pérdida de foco o comportamientos sospechosos en el cliente.
* **Analítica:** Validación de la integridad de los cálculos estadísticos (Unitario) y de la correcta generación de archivos de exportación (CSV/Excel).

## 4. Pruebas de rendimiento y carga (Locust)
Dada la alta densidad de requisitos de tiempo real (especialmente RF-21 y RF-32), las pruebas de carga son críticas:
* **Escenario de carga:** Simulación de una clase estándar (60 alumnos) respondiendo al unísono.
* **Escenario de estrés:** Identificación del límite de conexiones concurrentes antes de degradar la latencia.
* **Métricas:** Tiempo de respuesta (latencia de socket) y tasa de error en la recepción de respuestas masivas.

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
* **Módulos acotados:** Mismo alcance acotado que las pruebas de componentes (`auth`, `management`, `room-access` y `room-play`).
* **Objetivos de cobertura:** Mismos umbrales de referencia que las pruebas de componentes.

## 6. Automatización y CI/CD (GitHub Actions)
La suite de pruebas se ejecutará automáticamente bajo las siguientes condiciones:
* **Push/Pull Request a `main` y `develop`**.
* **Fallo Crítico:** Si un test falla o la cobertura cae, se bloqueará el despliegue automático hacia producción.

## 7. Entorno de ejecución e infraestructura
* **Aislamiento de datos:** Las pruebas se ejecutan contra una base de datos SQLite en memoria o una base de datos PostgreSQL temporal para garantizar la independencia de los resultados.
* **Backend:** Gestión de entorno y dependencias mediante **uv** (Python 3.12+).
* **Frontend:** Navegadores gestionados por Playwright (emulación móvil para alumnos) y Vitest para componentes.
* **CI/CD:** Runners de GitHub Actions utilizando `setup-uv` y acciones oficiales de Playwright.
