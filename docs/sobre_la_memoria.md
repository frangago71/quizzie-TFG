# Guía sobre la memoria del TFG y el flujo de trabajo en VSCode

Este documento detalla la configuración técnica necesaria para la redacción de la memoria del TFG y explica la organización del entorno de trabajo local.

## 1. Dependencias del sistema

Para permitir la compilación automática y la gestión de referencias, se han instalado las siguientes herramientas:

* **MiKTeX:** Distribución de LaTeX que actúa como el motor principal de composición. Se ha configurado en modo usuario para la gestión de paquetes.
* **Strawberry Perl:** Necesario para ejecutar `latexmk`, la herramienta que automatiza las múltiples pasadas de compilación.
* **Visual Studio Code:** Editor principal, utilizando la extensión **LaTeX Workshop** para integrar la previsualización y el tipado en tiempo real.

## 2. Justificación del flujo de trabajo

A diferencia del uso de herramientas externas en la nube, se ha optado por integrar la memoria directamente en el repositorio del proyecto por los siguientes motivos:

* **Historial de cambios:** Permite mantener un registro exacto de la evolución de la memoria mediante commits, permitiendo volver a versiones anteriores si fuera necesario.
* **Gestión por Issues:** La redacción se organiza mediante el sistema de tickets de GitHub, vinculando el avance del texto con las tareas de desarrollo e infraestructura.
* **Centralización:** Todo el material del TFG (código, documentación y memoria) reside en un único lugar, facilitando la trazabilidad de los objetivos.

## 3. Estructura de directorios

La documentación se organiza de forma modular dentro de la carpeta `/thesis` para separar los archivos de contenido de los activos visuales y de configuración:

* **`/thesis`**: Directorio raíz de la memoria. Contiene el archivo maestro (`memoria.tex`), su compilación en pdf (`memoria.pdf`) y la bibliografía (`bibliografia.bib`).
* **`/thesis/etc/`**: Contiene archivos de configuración y recursos adicionales para la compilación de LaTeX.
* **`/thesis/figures/`**: Almacén exclusivo para imágenes, diagramas y otros recursos gráficos que se incluyen en el documento.
* **`/thesis/sections/`**: Contiene los archivos fuente divididos por secciones para facilitar la edición y el control de versiones por separado.


## 4. Control de archivos en Git

Para mantener el repositorio limpio y eficiente, se aplica una política estricta de filtrado:

* **Archivos auxiliares:** El archivo `.gitignore` está configurado para omitir los archivos temporales de compilación (`.aux`, `.log`, `.toc`, etc.).
* **Entregables:** Se mantiene el seguimiento del archivo `memoria.pdf` para permitir una previsualización rápida del estado actual de la memoria sin necesidad de compilar localmente.

## 5. Integración con herramientas de calidad

Para evitar falsos positivos y ruido en las métricas de desarrollo, la carpeta `/thesis` está **excluida explícitamente** de los siguientes procesos de análisis:

* **SonarCloud:** Excluido mediante `sonar.exclusions` en `sonar-project.properties`.
* **Python Linting (Ruff):** Excluido en `pyproject.toml` para evitar el análisis de posibles scripts auxiliares.
* **JavaScript Linting (ESLint):** Ignorado en la configuración del frontend.
* **Pre-commit Hooks:** Se ha configurado una regla global en `.pre-commit-config.yaml` para saltar todas las validaciones (espacios, YAML, etc.) dentro de este directorio.
