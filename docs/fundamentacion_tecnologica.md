# Fundamentación tecnológica - Quizzie

Este documento sirve como guía detallada de la fundamentación tecnológica del Trabajo de Fin de Grado (TFG) **Quizzie**. Su propósito es analizar en profundidad cada una de las tecnologías que componen el ecosistema del proyecto, detallar las alternativas consideradas, justificar la decisión final de su elección y exponer las limitaciones técnicas identificadas.

A partir de este documento se estructurará la sección `\section{Fundamentación tecnológica}` de la memoria oficial del TFG.

---

## 1. Tabla resumen del stack tecnológico

La siguiente tabla resume los componentes principales del stack tecnológico seleccionado para **Quizzie**:

| Capa / ámbito | Tecnología elegida | Alternativas consideradas | Factores clave de elección |
| :--- | :--- | :--- | :--- |
| **Frontend (SPA)** | React (TypeScript) | Vue.js, Angular, Svelte | Mayor ecosistema, curva de aprendizaje óptima, tipado estricto. |
| **Build tool** | Vite | Webpack (CRA), Turbopack | Velocidad de compilación local y carga ultrarrápida (ES Modules). |
| **Estilos (CSS)** | CSS vanilla | Tailwind CSS, Bootstrap | Control total de animaciones y diseño premium personalizado sin sobrecarga. |
| **Backend (API)** | FastAPI (Python 3.12) | Django, Flask, Node.js (Express) | Soporte nativo asíncrono para WebSockets, documentación Swagger auto-generada. |
| **Gestión de dependencias** | uv | pip + virtualenv, Poetry, Pipenv | Extrema velocidad (Rust) y gestión unificada de entornos y scripts. |
| **ORM / validación** | SQLModel | SQLAlchemy + Pydantic, Django ORM | Evita duplicidad de modelos (DRY) al fusionar Pydantic y SQLAlchemy. |
| **Base de datos** | SQLite | PostgreSQL, MySQL, MongoDB | Base de datos empotrada ligera, cero administración, ideal para cargas TFG. |
| **Hosting backend** | Render | AWS, Heroku, Vercel (Serverless) | Soporte nativo y gratuito para procesos WebSockets persistentes (ASGI). |
| **Hosting frontend** | Vercel | Netlify, GitHub Pages | Despliegue continuo óptimo de SPAs, CDN global de alto rendimiento. |
| **Integración (CI)** | GitHub Actions | Jenkins, GitLab CI/CD | Integración nativa con el repositorio, runner gratuito para proyectos open-source. |
| **Estandarización commits** | Commitizen | Mensajes libres directos, Git Hooks manuales | Automatiza Conventional Commits, control de versiones y changelog. |
| **Calidad de código** | SonarCloud, Ruff, ESLint | Black + Flake8, Codeclimate | Linter en Rust ultrarrápido (Ruff) y auditoría de deuda técnica externa. |

---

## 2. Stack tecnológico seleccionado

La arquitectura de **Quizzie** se ha diseñado bajo un enfoque desacoplado, separando la interfaz de usuario en el cliente de la lógica de negocio y comunicación en el servidor:

*   **Capa de frontend (interfaz de usuario):** Se compone de una aplicación de página única (SPA) interactiva basada en **React**, utilizando **TypeScript** para introducir tipado estático estricto y **Vite** como entorno rápido de desarrollo y empaquetador. La estilización visual se realiza con **CSS *vanilla*** puro, lo que proporciona control completo sobre las animaciones, las transiciones de juego y la responsividad sin la sobrecarga de frameworks externos. Asimismo, se integran las librerías **qrcode.react** (para la generación y renderizado del código QR único en el dispositivo del alumno al finalizar la prueba) y **html5-qrcode** (para posibilitar al docente escanear dicho código de forma interactiva y presencial), sustentando el pilar funcional de la validación física en el aula.
*   **Capa de backend y servidor de sockets:** El servidor lógico funciona mediante una API REST y conexiones bidireccionales en tiempo real vía WebSockets escritas en **Python 3.12** con el framework **FastAPI**. Este framework proporciona soporte asíncrono nativo (`async/await`) necesario para gestionar la concurrencia en la sala de cuestionarios. La capa intermedia de base de datos se modela con **SQLModel**, simplificando la correspondencia entre objetos Python y registros SQL. Adicionalmente, el control de seguridad y sesiones de usuario se implementa mediante tokens de sesión sin estado JWT (*JSON Web Token*) con la librería **pyjwt**, y el cifrado seguro de contraseñas de docentes se gestiona con **pwdlib** aplicando el algoritmo de hashing **Argon2id**.
*   **Gestión de entornos y dependencias backend:** Se adopta **uv** como la herramienta unificada para la instalación ultrarrápida de paquetes, aislamiento de dependencias locales en un entorno virtual reproducible y ejecución segura de scripts en desarrollo y pruebas.
*   **Capa de persistencia de datos:** La persistencia recae en **SQLite**, un motor de base de datos empotrado ligero que almacena los datos en un único archivo de disco local en el servidor, eliminando por completo la complejidad de red de un motor cliente-servidor dedicado.
*   **Capa de infraestructura y DevOps:** El frontend está alojado en la red de distribución global (CDN) de **Vercel**, lo que optimiza los tiempos de carga del cliente. El backend se despliega en **Render** en un contenedor ASGI que soporta la persistencia de los sockets. El flujo se automatiza con pipelines de integración continua en **GitHub Actions**.
*   **Estandarización de commits:** El flujo de desarrollo está normado mediante **Commitizen**, una herramienta interactiva que ayuda al desarrollador a formatear los mensajes de confirmación de cambios bajo la convención *Conventional Commits*, facilitando el seguimiento de versiones y la auditoría automática del historial.

---

## 3. Alternativas consideradas y justificación de las decisiones

La selección de cada componente tecnológico ha sido evaluada frente a sus alternativas estándar en la industria:

*   **Alternativas de frontend (React frente a Angular/Vue.js/Svelte):** Angular se descartó por su excesiva verbosidad y curva de aprendizaje inclinada para el alcance del TFG. Vue.js se consideró viable, pero React posee un ecosistema de componentes significativamente mayor y una penetración en el mercado laboral más idónea para la especialización del autor. Svelte, pese a su ligereza, carece del soporte de librerías maduras existente en React. Respecto a la compilación, Webpack se descartó a favor de Vite debido al Hot Module Replacement (HMR) y tiempos de arranque local infinitamente superiores de este último.
*   **Alternativas de estilización (CSS frente a Tailwind CSS / Bootstrap):** Tailwind CSS se descartó por la acumulación excesiva de clases de utilidad en el marcado JSX, lo que dificulta la legibilidad. Bootstrap se rechazó por imponer estilos por defecto demasiado genéricos que dificultan la consecución de una identidad visual moderna y premium personalizada.
*   **Alternativas de backend (FastAPI frente a Node.js/Django/Flask):** Node.js (con Express o NestJS) representa el estándar de la industria en WebSockets; sin embargo, se priorizó Python 3.12 para facilitar la posterior integración del motor de inteligencia artificial (generador automático de cuestionarios) y capitalizar el dominio previo del lenguaje en la carrera. Django se descartó por su naturaleza fundamentalmente síncrona por defecto y el peso de su arquitectura monolítica, y Flask por carecer de herramientas integradas de validación y asincronía.
*   **Alternativas de gestión de dependencias backend (uv frente a pip/Poetry/Pipenv):** `pip + virtualenv` requiere coordinar múltiples comandos manuales y herramientas independientes para fijar dependencias (`pip-tools`), siendo muy lento. `Poetry` y `Pipenv` ofrecen lockfiles robustos pero sufren de tiempos de resolución extremadamente lentos. `uv` se selecciona al solventar ambos problemas: ofrece velocidad instantánea en Rust y centraliza la gestión en una sola herramienta moderna.
*   **Alternativas de base de datos (SQLite frente a PostgreSQL / MongoDB):** PostgreSQL y MySQL se analizaron como motores tradicionales cliente-servidor, pero se descartaron por el coste de despliegue en la nube y la complejidad de administración de accesos, innecesarias en la fase académica actual (aunque la abstracción de SQLModel permite migrar a PostgreSQL modificando únicamente la URI de conexión). MongoDB (NoSQL) se descartó debido a que el dominio del proyecto es intrínsecamente relacional.
*   **Alternativas de infraestructura (Vercel/Render frente a AWS/Heroku):** AWS (Amazon Web Services) ofrece control total, pero se descartó por la complejidad de su configuración de red y el riesgo de costes económicos no previstos. Heroku se rechazó debido a la inexistencia de planes gratuitos en su plataforma actual.
*   **Alternativas de estandarización de commits (Commitizen frente a mensajes libres):** Dejar la redacción de mensajes a la libertad del desarrollador acelera el commit de forma directa, pero introduce un desorden semántico grave a largo plazo, impidiendo automatizar la versión técnica. `Commitizen` unifica el estilo y las categorías (*feat, fix, docs, style, refactor*) mediante un prompt interactivo en terminal.

---

## 4. Limitaciones tecnológicas

A pesar de la idoneidad del stack seleccionado, se han identificado las siguientes limitaciones técnicas inherentes a las decisiones tomadas:

*   **Cold start en Render (plan gratuito):** El contenedor del backend se desactiva tras 15 minutos sin peticiones. Esto genera un retardo inicial de entre 30 y 50 segundos en la primera interacción de un usuario mientras el contenedor vuelve a iniciarse.
*   **Concurrencia de escritura en SQLite:** SQLite bloquea la base de datos a nivel de archivo al escribir. Aunque es imperceptible para un grupo estándar de alumnos, limitaría el escalado para miles de usuarios simultáneos escribiendo respuestas al unísono.
*   **Falta de SSR (*server-side rendering*) en el frontend:** Al ser una SPA de React pura, el indexado por motores de búsqueda (SEO) es limitado. Sin embargo, al ser una aplicación académica de acceso cerrado mediante credenciales, esta limitación no compromete su viabilidad.

---

## 5. Herramientas de soporte al desarrollo y control de calidad

Para facilitar el desarrollo del proyecto y cumplir con estándares profesionales de calidad de código, se han integrado las siguientes herramientas complementarias:

*   **Control de versiones e IDE:** Se utiliza **Git** alojado en **GitHub** para la gestión de ramas (*GitFlow*) y la trazabilidad de tareas mediante *issues*. Se implanta **Commitizen** en el flujo local para estandarizar los commits. El IDE utilizado es **Visual Studio Code**, configurado con **LaTeX Workshop** para unificar el entorno de código y la composición de la memoria en local mediante **MiKTeX y Strawberry Perl** (ejecutando *latexmk* para compilar la memoria integrada en el repositorio).
*   **Linter y formateo:** En el backend se utiliza **Ruff**, linter ultrarrápido programado en Rust que optimiza el cumplimiento de PEP 8 y unifica tareas que antes requerían múltiples librerías. En el frontend se emplea **ESLint** con *flat config* para controlar la calidad de TypeScript y de los *hooks* de React.
*   **Pre-commit hooks:** Con la librería **pre-commit**, se interceptan los *commits* locales para garantizar que solo se sube código limpio que supere las reglas de formato y análisis estático.
*   **Pruebas unitarias y de integración:** Se utiliza **pytest** en el backend junto a **pytest-cov** para el cálculo de cobertura, y **Vitest** con **React Testing Library** en el frontend para evaluar los componentes. Para flujos de usuario extremo a extremo (E2E), se integra **Playwright**, permitiendo simular múltiples navegadores concurrentes.
*   **Pruebas de carga:** Se emplea **Locust** para verificar de manera empírica la capacidad del servidor de soportar la avalancha de respuestas concurrentes de los alumnos.
*   **SonarCloud:** Se ha configurado este auditor externo de análisis estático como parte del flujo de CI/CD en GitHub Actions, exigiendo una meta de calidad estricta (*quality gate* A, duplicación < 3%, cobertura de tests > 80%).
