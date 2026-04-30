# Especificación l flujo de integración y despliegue continuos (CI/CD)

Este documento detalla el flujo de trabajo automatizado diseñado para **Quizzie**, con el fin de garantizar la calidad del software, la seguridad de las dependencias y la disponibilidad continua del servicio mediante un proceso de entrega profesional.

## 1. Ciclo de vida y flujo de trabajo (Workflow)
El proyecto implementa un flujo de trabajo automatizado que garantiza la entrega de código fiable mediante una ejecución secuencial de etapas. El orden técnico de ejecución del sistema es el siguiente:

1.  **Etapa de verificación (CI):** Se activa tras un `push` a la rama de desarrollo (`develop`). El sistema ejecuta de forma aislada las auditorías de seguridad y la suite de pruebas unitarias/integración. Esta etapa actúa como un "filtro de calidad" obligatorio previo a cualquier entrega o despliegue.
2.  **Etapa de consolidación:** Al integrar los cambios en la rama principal (`main`), el sistema ejecuta nuevamente el workflow completo de Integración Continua (CI). Esta redundancia asegura que la versión final candidata para producción mantiene la integridad total tras la consolidación de ramas.
3.  **Etapa de despliegue (CD):** Una vez que el código validado llega a `main`, las plataformas de hosting (Vercel y Render) disparan el despliegue de forma automática, garantizando que solo se publica código que ha superado los controles de calidad.

## 2. Pipeline de Integración Continua (CI)
El flujo de CI se gestiona mediante **GitHub Actions** y constituye el motor de validación del sistema. A diferencia de un despliegue puntual, este pipeline se ejecuta de forma sistemática ante cualquier cambio detectado tanto en la rama de desarrollo (`develop`) como en la rama de producción (`main`).

### A. Estructura de Ejecución
* **Ejecución Paralela:** Los procesos de Backend y Frontend se inician de forma simultánea en entornos virtuales independientes. Esto permite reducir el tiempo de *feedback* al desarrollador.
* **Dependencia Secuencial Estricta:** Dentro de cada entorno (Job), los pasos siguen una lógica de "falla uno, fallan todos". Si la instalación de dependencias o la auditoría de seguridad fallan, el pipeline interrumpe la ejecución inmediatamente, bloqueando la fase de pruebas y notificando el error específico.

### B. Auditoría de seguridad y dependencias
Como primer eslabón del flujo, se realiza un escaneo proactivo para mitigar riesgos antes de la ejecución del código:
* **Backend:** Auditoría del ecosistema Python mediante `safety` para identificar vulnerabilidades conocidas (CVE) en las dependencias.
* **Frontend:** Validación de integridad del árbol de Node.js mediante el comando `npm ci`, asegurando un entorno de construcción idéntico al de desarrollo.

### C. Ejecución de pruebas y validación de tipos
Es el núcleo del control de calidad:
* **Suite de pruebas (Backend):** Ejecución de 49 tests utilizando `pytest` en un contenedor efímero de Ubuntu.
* **Validación de tipos y Build (Frontend):** Ejecución de `npm run build` para asegurar que TypeScript no presenta errores de tipado y que el empaquetado final es funcional antes de llegar a producción.

## 3. Estrategia de Despliegue Continuo (CD)
A diferencia del CI, el despliegue no requiere scripts adicionales de GitHub Actions, ya que se apoya en la infraestructura nativa de las plataformas elegidas:

### A. Despliegue del Frontend (Vercel)
* **Trigger:** Detección de nuevo commit en `main`.
* **Proceso:** Vercel compila la SPA y distribuye los estáticos optimizados. El despliegue está condicionado al éxito previo de los checks de GitHub.

### B. Despliegue del Backend (Render)
* **Trigger:** Sincronización con la rama `main`.
* **Proceso:** Render aprovisiona el entorno, sincroniza dependencias con `uv` y reinicia el servicio de FastAPI. Está configurado para esperar el éxito de los "Status Checks" de GitHub antes de proceder a la actualización del servicio.

## 4. Resumen del flujo técnico

* **Push a la rama `develop` (Fase de Pruebas):**
    1.  **Job Backend (CI):** Instalación (uv) → Auditoría (pip-audit) → Tests (Pytest).
    2.  **Job Frontend (CI):** Instalación (npm ci) → Type Check & Build.
* **Push/Merge a la rama `main` (Fase de Producción):**
    1.  **Validación Final:** Se repite el CI completo. Si falla, el push es rechazado por el Ruleset de GitHub.
    2.  **Despliegue Automático:** Las plataformas actualizan la aplicación en vivo tras recibir el "OK" de los checks.
