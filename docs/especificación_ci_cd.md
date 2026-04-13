# Especificación l flujo de integración y despliegue continuos (CI/CD)

Este documento detalla el flujo de trabajo automatizado diseñado para **Quizzie**, con el fin de garantizar la calidad del software, la seguridad de las dependencias y la disponibilidad continua del servicio mediante un proceso de entrega profesional.

## 1. Ciclo de vida y flujo de trabajo (Workflow)
El proyecto implementa un flujo de trabajo automatizado que garantiza la entrega de código fiable mediante una ejecución secuencial de etapas. El orden técnico de ejecución del sistema es el siguiente:

1.  **Etapa de verificación (CI):** Se activa tras un `push` a la rama de desarrollo (`develop`). El sistema ejecuta de forma aislada las auditorías de seguridad y la suite de pruebas unitarias/integración. Esta etapa actúa como un "filtro de calidad" obligatorio previo a cualquier entrega o despliegue.
2.  **Etapa de consolidación:** Al integrar los cambios en la rama principal (`main`), el sistema ejecuta nuevamente el workflow completo de Integración Continua (CI). Esta redundancia asegura que la versión final candidata para producción mantiene la integridad total tras la consolidación de ramas.
3.  **Etapa de despliegue (CD):** Solo tras superar con éxito la verificación en la rama principal, se dispara de forma automatizada y simultánea el empaquetado del Frontend (Vite Build) y la actualización del entorno de ejecución del Backend (FastAPI), culminando con la puesta en producción del sistema.

## 2. Pipeline de Integración Continua (CI)
El flujo de CI se gestiona mediante **GitHub Actions** y constituye el motor de validación del sistema. A diferencia de un despliegue puntual, este pipeline se ejecuta de forma sistemática ante cualquier cambio detectado tanto en la rama de desarrollo (`develop`) como en la rama de producción (`main`).

### A. Auditoría de seguridad y dependencias
Como primer paso del flujo, el sistema realiza un escaneo proactivo de las librerías para mitigar riesgos de seguridad antes de la ejecución del código:
* **Backend:** Auditoría del ecosistema Python mediante las herramientas nativas de `uv` para identificar vulnerabilidades conocidas (CVE) en las dependencias del servidor.
* **Frontend:** Análisis del árbol de dependencias de Node.js para garantizar la integridad y seguridad de las librerías de React.

### B. Ejecución de pruebas automatizadas
Es el núcleo del control de calidad. Para garantizar que las nuevas funcionalidades no comprometan la lógica existente (regresiones), se ejecuta la suite completa de pruebas en cada iteración:
* **Suite de pruebas:** Ejecución de 49 tests (unitarios y de integración) utilizando el framework `pytest`.
* **Entorno de aislamiento:** Las pruebas se ejecutan en un contenedor efímero con una imagen de Ubuntu, asegurando un entorno limpio e idéntico al de ejecución real.
* **Criterio de aceptación y control de flujo:** El pipeline está configurado bajo una política de "tolerancia cero" al fallo; si un solo test resulta fallido, el proceso se interrumpe inmediatamente, notificando el error y bloqueando cualquier fase posterior de consolidación o despliegue.

## 3. Estrategia de Despliegue Continuo (CD)
Una vez validada la integridad del código mediante la verificación en la rama principal (`main`), el sistema automatiza la entrega hacia las plataformas de hosting de forma secuencial y coordinada:

### A. Despliegue del Frontend (SPA)
* **Plataforma:** Vercel.
* **Trigger:** Éxito del pipeline de CI en la rama `main`.
* **Proceso:** Vercel detecta la actualización, dispara el proceso de *build* de React mediante Vite (`npm run build`) y distribuye los archivos estáticos optimizados. Al estar desacoplado del backend, el frontend puede actualizarse de forma independiente siempre que se mantenga el contrato de la API.

### B. Despliegue del Backend (API)
* **Plataforma:** Render.
* **Trigger:** Sincronización con la rama `main` tras superar los controles de calidad.
* **Proceso:** Render aprovisiona el entorno, utiliza `uv` para sincronizar las dependencias de Python de manera eficiente y reinicia el servicio de FastAPI. Este proceso asegura que la lógica de servidor desplegada corresponde exactamente con la versión del código que superó satisfactoriamente la suite de pruebas automatizadas.

## 4. Resumen del flujo

* **Push a la rama `develop` (CI):**
    1.  **Auditoría:** Escaneo automático de seguridad en dependencias de Python y Node.js.
    2.  **Tests:** Ejecución de la suite de pruebas con `pytest` en un entorno aislado.

* **Push a la rama `main` (CI, CD):**
    1.  **Verificación (CI):** Se repite íntegramente el flujo de auditoría y tests para asegurar la integridad tras la fusión de ramas.
    2.  **Despliegue (CD):** Únicamente si el CI es satisfactorio, se ejecutan de forma simultánea:
        * **Frontend:** Compilación y publicación de la app en **Vercel**.
        * **Backend:** Sincronización de entorno y reinicio del servicio en **Render**.