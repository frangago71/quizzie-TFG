# Especificación del flujo de integración y despliegue continuos (CI/CD)

Este documento detalla el flujo de trabajo automatizado diseñado para **Quizzie**, con el fin de garantizar la calidad del software, la seguridad de las dependencias y la disponibilidad continua del servicio mediante un proceso de entrega profesional.

## 1. Ciclo de vida y flujo de trabajo (Workflow)
El proyecto implementa un flujo de trabajo secuencial que abarca desde el desarrollo local hasta la puesta en producción:

1. **Etapa 1 - Verificación Local (Pre-commit hooks):** Antes de registrar cualquier commit, se ejecutan comprobaciones automáticas en el entorno local (linting y formateo para backend y frontend).
2. **Etapa 2 - Integración Continua (CI):** Tras realizar `push` o `pull request` hacia las ramas `develop` o `main`, GitHub Actions ejecuta los flujos aislados de calidad, linter, seguridad y pruebas unitarias/integración.
3. **Etapa 3 - Análisis de Calidad Continuo (SonarQube):** Tras consolidar cambios en `main`, se ejecuta el análisis estático de código en SonarCloud.
4. **Etapa 4 - Despliegue Continuo (CD):** Al superar con éxito todas las validaciones en `main`, las plataformas de hosting (Vercel y Render) despliegan el servicio automáticamente.

## 2. Verificación Local (Pre-commit hooks)
Para evitar que los commits fallen posteriormente en la etapa de CI en remoto, el archivo `.pre-commit-config.yaml` intercepta la creación de commits y aplica comprobaciones y correcciones automáticas:

* **Backend (Python):**
  * **Ruff Check:** Ejecuta `ruff check --fix` para detectar y corregir errores estáticos.
  * **Ruff Format:** Formatea el código de Python respetando las reglas de estilo del proyecto (`ruff-format`).
* **Frontend (TypeScript / React):**
  * **ESLint Local:** Ejecuta `npx eslint --config frontend/eslint.config.js --fix` sobre los archivos modificados bajo `frontend/src/`, asegurando que las reglas de ESLint y Prettier se apliquen con la misma configuración exacta que en la integración continua.
* **Utilidades Generales:**
  * `trailing-whitespace`: Elimina espacios innecesarios al final de cada línea.
  * `end-of-file-fixer`: Asegura que todos los archivos terminen con una línea en blanco.
  * `check-yaml`: Valida la sintaxis de los archivos YAML.
  * `check-added-large-files`: Evita incluir accidentalmente archivos de gran tamaño.

## 3. Pipeline de Integración Continua (CI)
El flujo de CI se gestiona mediante dos workflows independientes en **GitHub Actions**:

### A. CI - Quality & Security (`quality_and_security.yml`)
Se ejecuta en cada `push` o `pull_request` a las ramas `main` y `develop`, y se compone de dos trabajos paralelos:

* **Backend CI (`backend-ci`):**
  * **Instalación:** Gestor de paquetes **uv** (`uv sync --all-groups`) para instalaciones reproducibles.
  * **Calidad de Código:** Verificación con **Ruff** (`uvx ruff check .`) y comprobación de formato (`uvx ruff format . --check`).
  * **Seguridad:** Auditoría de vulnerabilidades conocidas con `uvx pip-audit`.
  * **Pruebas:** Ejecución de tests con `pytest`, generando y subiendo el reporte de cobertura (`coverage.xml`).
* **Frontend CI (`frontend-ci`):**
  * **Instalación:** `npm ci` en el directorio `frontend` para un árbol de dependencias exacto y limpio.
  * **Linting:** Validación con **ESLint** (`npm run lint`).
  * **Compilación:** Compilación del proyecto (`npm run build`) para garantizar la ausencia de errores de tipado antes de producción.

### B. Code Quality - SonarQube (`sonar.yml`)
Workflow autocontenido para el análisis estático en SonarCloud:
* **Trigger:** Ejecución exclusiva ante `push` en la rama principal (`main`).
* **Análisis estático:** Generación de métricas de cobertura y mantenibilidad enviadas a SonarCloud.

## 4. Estrategia de Despliegue Continuo (CD)

### A. Despliegue del Frontend (Vercel)
* **Trigger:** Nuevos commits en la rama `main`.
* **Condición:** Activación condicionada al éxito previo de las pruebas de CI.

### B. Despliegue del Backend (Render)
* **Trigger:** Invocación controlada del Deploy Hook mediante GitHub Actions tras la aprobación de los trabajos de `backend-ci` y `frontend-ci` en la rama `main`.

## 5. Resumen del flujo técnico (Orden cronológico)

1. **[Desarrollo Local]** ──> Pre-commit Hooks (Ruff + ESLint local con `frontend/eslint.config.js`)
2. **[Push / PR]** ─────────> GitHub Actions (`quality_and_security.yml`):
                              * **Backend CI:** Ruff Check & Format + pip-audit + Pytest
                              * **Frontend CI:** ESLint + npm run build
3. **[Merge a main]** ──────> SonarQube Scan (`sonar.yml`) + CD Deploy Hook (Vercel & Render)
