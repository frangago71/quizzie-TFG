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
El proyecto incluye una suite de pruebas automatizadas para garantizar la integridad del código y la lógica de negocio.

#### Ejecutar los tests
Desde la raíz, utiliza `uv` para lanzar las pruebas:

```bash
uv run pytest
```

#### Reporte de cobertura (Coverage)
Para generar un informe detallado sobre qué porcentaje del código está cubierto por los tests, ejecuta:

```bash
uv run pytest --cov=backend --cov-report=term-missing
```

* **`--cov=backend`:** Indica el directorio del código fuente a analizar.
* **`--cov-report=term-missing`:** Muestra en la terminal las líneas exactas que no están cubiertas por ninguna prueba.

---

### 5. Despliegue

Puedes acceder a las versiones en la nube a través de los siguientes enlaces:

* **Frontend (Cliente Web):** [https://tu-app.vercel.app](https://tu-app.vercel.app)  
    *Desplegado en **Vercel**.*
* **Backend (API REST):** [https://tu-api.onrender.com](https://tu-api.onrender.com)  
    *Desplegado en **Render**.*
* **Documentación Interactiva (Swagger):** [https://tu-api.onrender.com/docs](https://tu-api.onrender.com/docs)


> **Nota sobre el rendimiento:** Debido al uso del plan gratuito de Render, el servidor puede entrar en estado de "hibernación" tras un periodo de inactividad. Si es la primera vez que accedes, la carga inicial de datos puede demorar entre **30 y 50 segundos** mientras el backend se reinicia automáticamente.

---
