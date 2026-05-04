# Documentación de aseguramiento de calidad del código

Este documento describe los estándares, herramientas y procesos implementados para garantizar la integridad, mantenibilidad y seguridad del código en el proyecto. Se ha adoptado un enfoque de calidad en tres capas: local, integración y análisis estático.

## 1. Estándares de estilo y seguridad de tipos

### Backend (Python)
Se utiliza **Ruff**, un linter y formateador de alto rendimiento que asegura el cumplimiento de PEP 8 y detecta errores potenciales de forma instantánea.
- **Configuración:**
  - **Linter:** Se aplican reglas de `Error` (E), `Pyflakes` (F), `Isort` (I), `PEP8-naming` (N) y `Warnings` (W).
  - **Formateador:** Configurado con comillas dobles, sangría de espacios y una longitud de línea máxima de 100 caracteres.
  - **Exclusiones:** Se ignoran automáticamente los archivos de tests y entornos virtuales.
- **Inyección de dependencias:** Se ha migrado al uso de `Annotated` (ej. `db: Annotated[Session, Depends(get_session)]`). Este estándar de FastAPI mejora la compatibilidad con el análisis estático y permite separar claramente la definición del tipo de la lógica de inyección.

**Comandos útiles:**
```bash
uvx ruff check .        # Revisar errores
uvx ruff check . --fix  # Corregir errores automáticamente
uvx ruff format .       # Formatear código
uvx pip-audit           # Auditoría de seguridad de dependencias
```

### Frontend (TypeScript/React)
Se ha puesto especial foco en la **eliminación de tipos `any`** y en la robustez de los componentes de React.
- **Seguridad de tipos:** Uso de interfaces estrictas (ej. `RoomData`, `QuizData`) y de la sintaxis `import type` para asegurar que el tipado no genere código innecesario en el bundle final.
- **Estabilización de Hooks:** Auditoría de dependencias en `useEffect` y `useCallback` para garantizar un ciclo de vida de componentes eficiente y sin fugas de memoria.
- **Arquitectura de Contextos:** Organización cohesionada de Providers y Hooks (ej. `RoomContext`), utilizando supresiones técnicas selectivas de ESLint para mantener la compatibilidad con **Fast Refresh** sin sacrificar la mantenibilidad.
- **ESLint:** Configurado con **Flat Config** para validar el cumplimiento de las reglas de hooks y las mejores prácticas de React.

**Comandos útiles:**
```bash
npm run lint            # Revisar errores con ESLint
npx eslint . --fix      # Corregir errores automáticamente
npm audit               # Auditoría de seguridad de dependencias
```

---

## 2. Automatización con git hooks (pre-commit)

Para evitar que código defectuoso llegue al repositorio, se utiliza **pre-commit**. Esta herramienta intercepta el comando `git commit` y ejecuta validaciones automáticas.

- **Instalación:** `uv run pre-commit install`
- **Validaciones locales:**
  - Limpieza de espacios en blanco y finales de archivo.
  - Ejecución de Ruff (Lint y Format).
  - Validación de ESLint para archivos TypeScript.
- **Funcionamiento:** Si se detectan fallos, el commit se detiene y la herramienta aplica correcciones automáticas siempre que sea posible.

**Auditoría manual (opcional):**
Aunque el proceso es automático al hacer commit, puedes ejecutar una validación completa de todo el proyecto en cualquier momento (útil para revisar archivos no modificados o antes de un push):
```bash
uv run pre-commit run --all-files
```



## 3. Integración Continua (CI)

La validación del código está totalmente automatizada mediante **GitHub Actions**. El pipeline de CI se dispara de forma sistemática ante cualquier `push` o `pull_request` dirigido a las ramas `develop` y `main`.

Este proceso actúa como un "filtro de calidad" obligatorio: si alguna de las etapas de validación (linting, seguridad o tests) falla, el sistema bloquea la integración del código para proteger la estabilidad del proyecto.

> Para una descripción técnica detallada de las etapas, entornos y procesos de despliegue, consulte la [Especificación de CI/CD](especificaci%C3%B3n_ci_cd.md).

## 4. Análisis estático con SonarCloud

Se utiliza **SonarCloud** como auditor externo para detectar deuda técnica y vulnerabilidades complejas.

- **Métricas Clave:**
  - **Bugs y Vulnerabilidades:** Identificación de errores lógicos y brechas de seguridad.
  - **Code Smells:** Detección de deuda técnica y complejidad cognitiva.
  - **Cobertura de Tests:** Monitorización de la protección de la lógica de negocio.

### Métricas Objetivo (Quality Gate)
Para asegurar la excelencia del código, se han definido los siguientes umbrales mínimos para cualquier nueva funcionalidad integrada en `main`:
| Métrica | Objetivo | Razón |
| :--- | :--- | :--- |
| **Cobertura de Tests** | > 80% | Garantizar que la mayoría de flujos críticos están probados. |
| **Código Duplicado** | < 3% | Evitar redundancia y facilitar el mantenimiento futuro. |
| **Reliability (Bugs)** | Calificación A | Cero bugs conocidos en el código nuevo. |
| **Security** | Calificación A | Cero vulnerabilidades detectadas. |
| **Maintainability** | Calificación A | Deuda técnica mínima y código limpio. |

### Exclusiones técnicas
Para que las métricas de SonarCloud sean representativas de la calidad del producto final, se han aplicado las siguientes configuraciones de calibración:

- **Exclusión de script de datos (`seed.py`):** El archivo `backend/seed.py` se ha excluido tanto del análisis de duplicación como del cálculo de cobertura. Al ser un script de generación de datos masivos con estructuras repetitivas, su inclusión distorsionaba el porcentaje de duplicación del proyecto y bajaba artificialmente la media de cobertura.
- **Mapeo de cobertura:** Se utiliza la propiedad `sonar.python.coverage.reportPaths=coverage.xml` en el archivo de configuración para asegurar que los resultados de `pytest-cov` se integren correctamente en el panel de SonarCloud.
- **Entorno de análisis:** El job de CI para SonarQube se ejecuta en un entorno Linux (`ubuntu-latest`) para garantizar la consistencia en el mapeo de rutas de archivos entre el informe de cobertura y el código fuente.



## 5. Protección de ramas

Para garantizar la estabilidad de la rama principal, se han implementado reglas de repositorio en GitHub:
- **Status checks obligatorios:** No se permite el push o merge a `main` si los jobs de "Backend CI" o "Frontend CI" han fallado.
- **Integridad del historial:** Esto obliga a que cualquier error detectado en local o en CI deba ser corregido en la rama `develop` antes de integrarse en la rama principal.


## 6. Resumen de comandos antes de cada Push

### 1. Validación de estilo y formato
- **Ejecución:** Se activa sola al hacer `commit`. Alternativamente, puedes forzarla con `uv run pre-commit run --all-files`.

**Nota sobre fallos:** La mayoría de fallos de formato se corrigen automáticamente al ejecutar el comando anterior. Si tras la ejecución siguen apareciendo errores:
- **Backend:** Usa `uvx ruff check . --fix` para errores de lógica/estilo y `uvx ruff format .` para el formato.
- **Frontend:** Usa `npx eslint . --fix` para corregir reglas de TypeScript/React.
- Si los errores persisten, deberás corregirlos manualmente siguiendo las indicaciones de la consola.



### 2. Auditoría de seguridad y lógica
Ejecuta estos comandos solo cuando la validación de estilo sea correcta:
- **Seguridad Backend:** `uvx pip-audit` (detecta vulnerabilidades en librerías).
- **Seguridad Frontend:** `npm audit` (revisa el árbol de dependencias de Node).
- **Pruebas unitarias y Cobertura:** `uv run pytest --cov=backend --cov-report=xml` (genera el informe necesario para SonarCloud).

### 3. Integración final
Antes de dar la tarea por concluida, asegúrate de la consistencia global:

- **SonarCloud Quality Gate:** Una vez subido el código, entra en el panel de SonarCloud y confirma que el proyecto mantiene la **Calificación A** y que no se han introducido nuevos "Code Smells".
- **Monitorización de Despliegue:** Verifica en Render (Backend) y Vercel (Frontend) que el despliegue automático de la rama `main` se ha completado sin errores de entorno.
