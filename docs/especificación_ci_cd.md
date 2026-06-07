# Especificación del flujo de integración y despliegue continuos (CI/CD)

Este documento detalla el flujo de trabajo automatizado diseñado para **Quizzie**, con el fin de garantizar la calidad del software, la seguridad de las dependencias y la disponibilidad continua del servicio mediante un proceso de entrega profesional.

## 1. Ciclo de vida y flujo de trabajo (Workflow)
El proyecto implementa un flujo de trabajo automatizado que garantiza la entrega de código fiable mediante una ejecución secuencial de etapas. El orden técnico de ejecución del sistema es el siguiente:

1.  **Etapa de verificación (CI):** Se activa tras un `push` a la rama de desarrollo (`develop`). El sistema ejecuta de forma aislada las auditorías de seguridad, el linting y la suite de pruebas unitarias/integración.
2.  **Etapa de consolidación:** Al integrar los cambios en la rama principal (`main`), el sistema ejecuta nuevamente el workflow completo. Esta redundancia asegura la integridad total tras la consolidación de ramas.
3.  **Etapa de despliegue (CD):** Una vez que el código validado llega a `main`, las plataformas de hosting disparan el despliegue automático.

## 2. Pipeline de Integración Continua (CI)
El flujo de CI se divide en dos workflows independientes gestionados mediante **GitHub Actions**:

### A. CI - Quality & Security (`quality_and_security.yml`)
Este workflow se ejecuta en cada `push` o `pull_request` a las ramas `main` y `develop`, y se compone de dos trabajos paralelos:

*   **Backend CI (`backend-ci`):**
    *   **Instalación:** Se utiliza el gestor de paquetes **uv** (`uv sync --all-groups`) para una instalación ultra-rápida y reproducible.
    *   **Calidad de Código:** Ejecución de **Ruff** para linting (`uvx ruff check .`) y formateo (`uvx ruff format . --check`).
    *   **Seguridad:** Auditoría de vulnerabilidades conocidas con `uvx pip-audit`.
    *   **Pruebas:** Ejecución de tests con `pytest`, generando y subiendo el reporte de cobertura (`coverage.xml`).
*   **Frontend CI (`frontend-ci`):**
    *   **Instalación:** `npm ci` en el directorio `frontend` para un árbol de dependencias exacto y limpio.
    *   **Linting:** Ejecución de **ESLint** (`npm run lint`) para validar reglas de React y tipado.
    *   **Compilación:** Compilación del proyecto (`npm run build`) para asegurar la ausencia de errores de tipado antes de producción.

### B. Code Quality - SonarQube (`sonar.yml`)
Para optimizar el uso de recursos y evitar ejecuciones redundantes, el análisis estático de código se ha separado en este workflow independiente.
*   **Trigger:** Se ejecuta únicamente ante un `push` en la rama principal (`main`).
*   **Análisis estático (SonarCloud):** Se ejecuta en un runner de **ubuntu-latest** para consistencia de rutas:
    *   **Integración de cobertura:** Se descarga el artefacto `coverage.xml` generado en el backend para mostrar las métricas de cobertura real.
    *   **Detección de deuda técnica:** Identificación automatizada de bugs, vulnerabilidades de seguridad y code smells.

## 3. Estrategia de Despliegue Continuo (CD)
El despliegue se apoya en la infraestructura nativa de las plataformas elegidas:

### A. Despliegue del Frontend (Vercel)
* **Trigger:** Nuevo commit en `main`.
* **Condición:** Solo se activa si los checks de GitHub pasan correctamente.

### B. Despliegue del Backend (Render)
* **Trigger:** Sincronización con la rama `main`.
* **Seguridad:** Está configurado para esperar el éxito de los "Status Checks" de GitHub antes de reiniciar el servicio de FastAPI.

## 4. Resumen del flujo técnico

### En ramas `develop` y `main` (via `quality_and_security.yml`):
1.  **Job Backend:** Instalación (uv) → Ruff Check & Format → pip-audit → Pytest → Upload Coverage.
2.  **Job Frontend:** Instalación (npm ci) → ESLint → Build.

### Solo en rama `main` (via `sonar.yml`):
3.  **Job Sonarqube:** Download Coverage → SonarCloud Scan (Ubuntu).
