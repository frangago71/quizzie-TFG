# Quizzie - TFG

**Trabajo de Fin de Grado**
*Grado en Ingeniería del Software - Universidad de Sevilla*
*Autor: Francisco Gago Vázquez*

---

## Descripción del proyecto
**Quizzie** es una plataforma web interactiva para crear, gestionar y realizar cuestionarios en tiempo real.
El objetivo principal es desarrollar un sistema que permita a los usuarios (profesores) crear preguntas personalizadas, gestionar salas y visualizar resultados, utilizando las últimas tecnologías de desarrollo web, priorizando escalabilidad, rendimiento y proporcionando una experiencia de usuario optimizada.

---

## Stack tecnológico

El proyecto está construido sobre un stack moderno y eficiente:

### Backend
* **Lenguaje:** Python 3.12
* **Framework:** FastAPI (Alto rendimiento y validación de datos)
* **ORM / Base de datos:** SQLModel (Interacción con SQLite)
* **Gestor de paquetes:** uv (Gestión de dependencias ultrarrápida)

### Frontend (SPA)
* **Framework:** React
* **Build Tool:** Vite (Entorno de desarrollo rápido)
* **Lenguaje:** JavaScript / TypeScript

---

## Guía de instalación y ejecución

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina local.

### 1. Requisitos previos
Asegúrate de tener instalado en tu sistema:
* [Git](https://git-scm.com/)
* [Python 3.12](https://www.python.org/)
* [Node.js](https://nodejs.org/)

### 2. Clonar y preparar el repositorio
Clona el repositorio alojado en [https://github.com/frangago71/quizzie-TFG.git](https://github.com/frangago71/quizzie-TFG.git)
~~~bash
git clone https://github.com/frangago71/quizzie-TFG.git
cd quizzie-TFG
~~~

Si no lo tienes, instala el gestor [uv](https://docs.astral.sh/uv/) y sincroniza las dependencias. Posteriormente, pobla la base de datos.

~~~bash
cd backend
pip install uv

# Usa uv para instalar las dependencias y crear el entorno virtual automáticamente
uv sync

# Pobla la base de datos
uv run python -m seed
~~~

Instala las librerías de Node.js necesarias.

~~~bash
cd ../frontend
npm install
~~~

### 3. Ejecutar el proyecto
El proyecto funciona con dos servidores simultáneos (Backend y Frontend). Se recomienda abrir **dos terminales** en tu entorno de desarrollo.

#### Terminal 1: Backend

~~~bash
cd backend
uv run fastapi dev
~~~

* **API Docs (Swagger):** `http://127.0.0.1:8000/docs`
* **Servidor:** `http://127.0.0.1:8000`

#### Terminal 2: Frontend

~~~bash
cd frontend
npm run dev
~~~

* **Aplicación Web:** `http://localhost:5173` (o la URL que indique la terminal)

### 4. Testing y cobertura
El proyecto incluye suites de pruebas automatizadas tanto para el backend como para el frontend para garantizar la calidad y estabilidad de la aplicación.

#### Backend (pytest + pytest-cov)
* **Ejecutar los tests del backend:**
Desde la raíz del proyecto, utiliza `uv` para lanzar las pruebas:
  ```bash
  uv run pytest
  ```

* **Reporte de cobertura en terminal:**
Para generar un informe detallado sobre qué porcentaje del código backend está cubierto por los tests, ejecuta:
  ```bash
  uv run pytest --cov=backend --cov-report=term-missing
  ```
  * **`--cov=backend`:** Indica el directorio del código fuente a analizar.
  * **`--cov-report=term-missing`:** Muestra en la terminal las líneas exactas que no están cubiertas por ninguna prueba.

#### Frontend (Vitest + React Testing Library + @vitest/coverage-v8)

* **Ejecutar los tests de componentes:**
Navega a la carpeta frontend y lanza las pruebas de interfaz (o `npm run test:watch` para desarrollo interactivo):
  ```bash
  cd frontend
  npm run test
  ```

* **Reporte de cobertura en consola:**
Para analizar el porcentaje de código del frontend cubierto por las pruebas unitarias (acotado a `auth`, `management`, `room-access` y `room-play`), ejecuta:
  ```bash
  cd frontend
  npm run test:frontend:coverage
  ```

* **Ver el informe de cobertura unitaria (HTML):**
Para previsualizar en el navegador el mapa de cobertura HTML generado por Vitest (`frontend/coverage/index.html`):
  ```bash
  cd frontend
  npm run cov-report:frontend
  ```

#### Pruebas End-to-End y cobertura E2E (Playwright + monocart-coverage-reports)

* **Alcance de Cobertura E2E:** Centrada en las vistas y pantallas navegables de los Casos de Uso. Los diálogos/ventanas modales auxiliares (`LogoutModal.tsx`, `DeleteQuizModal.tsx`, etc.) se prueban en la capa de componentes con Vitest y quedan excluidos de las pruebas E2E, ya que son avisos temporales en pantalla que pueden provocar desviaciones en la medición de cobertura que no serían del todo acertadas.

* **Ejecutar la suite de pruebas E2E con captura de cobertura V8:**
Para lanzar la batería completa de pruebas de extremo a extremo que validan los Casos de Uso (CU-01 a CU-10) sobre la build de producción y registrar la cobertura nativa V8:
  ```bash
  cd frontend
  npm run test:e2e
  ```

* **Ver el informe HTML de ejecución de Playwright:**
Para inspeccionar los resultados detallados de la ejecución de pruebas E2E (trazas, capturas y pasos):
  ```bash
  cd frontend
  npx playwright show-report
  ```

* **Ver el informe de cobertura E2E (HTML de Monocart):**
Para previsualizar en el navegador el mapa de cobertura interactivo V8 generado durante las pruebas E2E (`frontend/coverage-e2e/index.html`):
  ```bash
  cd frontend
  npm run cov-report:e2e
  ```

#### Pruebas de rendimiento y carga (Locust)

> **Requisito previo:** El servidor Backend (FastAPI) **debe estar previamente iniciado** en `http://127.0.0.1:8000` (Terminal 1: `cd backend` -> `uv run fastapi dev`).

* **Ejecutar script de benchmarking automatizado (con valores por defecto):**
  Lanza la prueba de rendimiento sin interfaz gráfica utilizando el script preconfigurado (por defecto **200 usuarios**, tasa de **15 u/s** y **1 minuto** de duración):
  ```bash
  uv run python tests/performance/run_performance_tests.py
  ```

* **Ejecutar script personalizando parámetros de carga:**
  Puedes especificar directamente el número de usuarios virtuales, la velocidad de incorporación y la duración desde la terminal:
  ```bash
  uv run python tests/performance/run_performance_tests.py -u 300 -r 25 -t 2m
  ```
  * **`-u 300` (`--users`):** Número total de usuarios virtuales simultáneos a simular (default: `200`).
  * **`-r 25` (`--spawn-rate`):** Tasa de incorporación por segundo (default: `15`).
  * **`-t 2m` (`--run-time`):** Duración total de la prueba, ej. `30s`, `1m`, `5m` (default: `1m`).
  * **`--host http://127.0.0.1:8000`:** URL del backend objetivo (default: `http://127.0.0.1:8000`).


* **Ejecutar en modo interactivo con interfaz web (Navegador):**
  Abre la interfaz gráfica de monitoreo en tiempo real de Locust en `http://localhost:8089` para ajustar parámetros visualmente desde el navegador:
  ```bash
  uv run locust -f tests/performance/locustfile.py --host http://127.0.0.1:8000
  ```

#### Interpretación de informes CSV

Al ejecutar las pruebas en modo *headless*, Locust genera automáticamente informes detallados en el directorio `tests/performance/`:
* `tests/performance/benchmark_results_stats.csv`: Resumen cuantitativo por cada tipo de petición y endpoint.
* `tests/performance/benchmark_results_failures.csv`: Registro específico de errores si alguna petición falló.
* `tests/performance/benchmark_results_exceptions.csv`: Traceback de excepciones de Python ocurridas en los usuarios virtuales.
* `tests/performance/benchmark_results_stats_history.csv`: Evolución temporal de las métricas segundo a segundo.

**Columnas principales a revisar en `benchmark_results_stats.csv`:**
- **`Request Count`:** Número total de peticiones procesadas por el endpoint.
- **`Failure Count`:** Peticiones fallidas (debe ser 0 o muy bajo).
- **`Median Response Time` (o `50%`):** Tiempo de respuesta mediano en ms (experiencia del 50% de los usuarios).
- **`90%` (P90):** Latencia máxima experimentada por el 90% de las peticiones (métrica principal de calidad).
- **`Requests/s` (RPS):** Peticiones por segundo procesadas por el servidor.

* **Auditar umbrales fijos sobre los informes CSV generados:**
  Si deseas verificar si las métricas del último reporte CSV superan los umbrales fijos de calidad en el percentil 90 (tasa de errores `< 1.0 %`, REST P90 `<= 200 ms` y auth/pesadas P90 `<= 500 ms`), puedes ejecutar de forma independiente:
  ```bash
  uv run python tests/performance/evaluate_thresholds.py
  ```


### 5. Despliegue

Puedes acceder a las versiones en la nube a través de los siguientes enlaces:

* **Frontend (Cliente Web):** [https://quizzie-tfg.vercel.app](https://quizzie-tfg.vercel.app)
    *Desplegado en **Vercel**.*
* **Backend (API REST):** [https://quizzie-tfg.onrender.com](https://quizzie-tfg.onrender.com)
    *Desplegado en **Render**.*
* **Documentación interactiva (Swagger):** [https://quizzie-tfg.onrender.com/docs](https://quizzie-tfg.onrender.com/docs)
* **Documentación interactiva (ReDoc):** [https://quizzie-tfg.onrender.com/redoc](https://quizzie-tfg.onrender.com/redoc)

> **Nota sobre el rendimiento:** Debido al uso del plan gratuito de Render, el servidor puede entrar en estado de "hibernación" tras un periodo de inactividad. Si es la primera vez que accedes, la carga inicial de datos puede demorar entre **30 y 50 segundos** mientras el backend se reinicia automáticamente.

---
