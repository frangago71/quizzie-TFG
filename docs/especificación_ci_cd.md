# Especificación del flujo de integración y despliegue continuos (CI/CD)

Este documento detalla el flujo de trabajo automatizado diseñado para **Quizzie**, con el fin de garantizar la calidad del software, la seguridad de las dependencias y la disponibilidad continua del servicio mediante un proceso de entrega profesional.

## 1. Ciclo de vida y flujo de trabajo (Workflow)
El proyecto implementa un flujo de trabajo automatizado que garantiza la entrega de código fiable mediante una ejecución secuencial de etapas. El orden técnico de ejecución del sistema es el siguiente:

1.  **Etapa de verificación (CI):** Se activa tras un `push` a la rama de desarrollo (`develop`). El sistema ejecuta de forma aislada las auditorías de seguridad, el linting y la suite de pruebas unitarias/integración.
2.  **Etapa de consolidación:** Al integrar los cambios en la rama principal (`main`), el sistema ejecuta nuevamente el workflow completo. Esta redundancia asegura la integridad total tras la consolidación de ramas.
3.  **Etapa de despliegue (CD):** Una vez que el código validado llega a `main`, las plataformas de hosting disparan el despliegue automático.

## 2. Pipeline de Integración Continua (CI)
El flujo de CI se gestiona mediante **GitHub Actions** (`ci.yml`) y constituye el motor de validación del sistema.

### A. Estructura de ejecución
* **Ejecución paralela:** Los procesos de Backend y Frontend se inician de forma simultánea en entornos virtuales independientes (Ubuntu-latest).
* **Dependencia de calidad:** El análisis final de SonarCloud depende del éxito previo de los jobs de Backend y Frontend.

### B. Validación de Backend (Python)
Se utiliza el gestor de paquetes **uv** para una instalación ultra-rápida y reproducible:
* **Instalación:** `uv sync --all-groups` para incluir dependencias de desarrollo y tests.
* **Calidad de Código:** Ejecución de **Ruff** para linting y formateo mediante `uvx ruff`.
* **Seguridad:** Auditoría de vulnerabilidades conocidas con `uvx pip-audit`.
* **Pruebas:** Ejecución de tests con `pytest`, generando un reporte de cobertura (`coverage.xml`).

### C. Validación de Frontend (TypeScript/React)
* **Instalación:** `npm ci` para garantizar un árbol de dependencias exacto y limpio.
* **Linting:** Ejecución de **ESLint** para validar reglas de React y tipos.
* **Build:** Compilación del proyecto (`npm run build`) para asegurar que no hay errores de tipado antes del despliegue.

### D. Análisis estático (SonarCloud)
Como capa final, se ejecuta un análisis profundo en un runner de **Windows-latest** (siguiendo la recomendación oficial de SonarSource):
* **Integración de cobertura:** Se descarga el artefacto `coverage.xml` del backend para que Sonar pueda mostrar métricas de cobertura real.
* **Detección de deuda técnica:** Identificación de bugs, vulnerabilidades y code smells.

## 3. Estrategia de Despliegue Continuo (CD)
El despliegue se apoya en la infraestructura nativa de las plataformas elegidas:

### A. Despliegue del Frontend (Vercel)
* **Trigger:** Nuevo commit en `main`.
* **Condición:** Solo se activa si los checks de GitHub pasan correctamente.

### B. Despliegue del Backend (Render)
* **Trigger:** Sincronización con la rama `main`.
* **Seguridad:** Está configurado para esperar el éxito de los "Status Checks" de GitHub antes de reiniciar el servicio de FastAPI.

## 4. Resumen del flujo técnico (develop/main)

1.  **Job Backend:** Instalación (uv) → Ruff → pip-audit → Pytest → Upload Coverage.
2.  **Job Frontend:** Instalación (npm ci) → ESLint → Build.
3.  **Job Sonarqube:** Download Coverage → SonarCloud Scan (Windows).
