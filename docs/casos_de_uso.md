# Especificación de Casos de Uso

Este documento detalla las interacciones entre los usuarios y el sistema, estableciendo el puente entre los requisitos funcionales y la implementación técnica del proyecto.

## 1. Actores del sistema

* **Profesor:** Usuario registrado encargado de la creación de contenido académico, gestión de grupos y administración de las sesiones de evaluación. Es el único actor con permisos para validar resultados de forma presencial.
* **Alumno:** Usuario no registrado que participa en las sesiones de juego en tiempo real. Su interacción se centra en la respuesta a cuestionarios y la obtención de certificados de autoría (QR).
* **Sistema de IA:** Actor externo (API) que procesa las peticiones del profesor para la generación automática de preguntas y soporte en la navegación.


## 2. Descripción de Casos de Uso

### 2.1 Módulo de usuarios
* **CU-01: Autenticación:** Permite al profesor acceder a su panel privado, registrarse o cerrar sesión de forma segura.

### 2.2 Módulo de contenido
* **CU-02: Gestionar cuestionarios:** El profesor puede crear, editar, listar y eliminar sus bancos de preguntas.
* **CU-03: Generar preguntas con IA:** Extensión del CU-02 donde el profesor solicita a la IA la creación de borradores de preguntas basados en un tema.

### 2.3 Módulo de sesiones
* **CU-04: Administrar sala:** El profesor instancia un cuestionario, genera un PIN de acceso y controla el flujo de la partida (inicio, paso de preguntas y cierre).
* **CU-05: Unirse a sala y hacer el test:** El alumno accede mediante PIN, responde a las preguntas sincronizadas y recibe feedback inmediato sobre su rendimiento.
* **CU-06: Ver Ranking en vivo:** Los alumnos y el profesor visualizan la progresión de los líderes de la sala tras cada pregunta.
* **CU-07: Validar nota mediante QR:** El profesor utiliza su dispositivo para escanear el código QR del alumno, verificando su identidad y presencia física para oficializar la calificación.
* **CU-08: Consultar estadísticas:** El profesor analiza los puntos críticos y el rendimiento general de la clase tras finalizar la sesión.
* **CU-09: Exportar resultados:** El profesor descarga los datos de los alumnos verificados en formato CSV para su uso en plataformas externas.
* **CU-10: Responder preguntas:** El alumno puede responder durante el tiempo determinado a las preguntas del test obteniendo la puntuación pertinente.


## 3. Especificación detallada de Casos de Uso

### CU-01: Autenticación
* **Actor principal:** Profesor.
* **Precondición:** El profesor debe estar registrado en la plataforma.
* **Flujo principal:**
    1. El profesor introduce su correo electrónico y contraseña en el formulario de login.
    2. El sistema cifra la contraseña introducida y la compara con el hash almacenado.
    3. El sistema genera un token de sesión (JWT) y redirige al profesor a su panel principal.
* **Flujo alternativo:** Si las credenciales son incorrectas, el sistema muestra un mensaje de error y permite reintentar el acceso.

### CU-02: Gestionar cuestionarios
* **Actor principal:** Profesor.
* **Precondición:** El profesor ha iniciado sesión correctamente.
* **Flujo principal:**
    1. El profesor accede a su biblioteca de contenidos.
    2. Selecciona la opción de crear un nuevo cuestionario o editar uno existente.
    3. El profesor define el título, descripción y añade preguntas con sus respectivas opciones.
    4. El profesor marca la opción correcta para cada pregunta y asigna una puntuación.
    5. El sistema guarda los cambios en la base de datos persistente.
* **Postcondición:** El cuestionario queda disponible para ser utilizado en una sala.

### CU-03: Generar preguntas con IA
* **Actor principal:** Profesor.
* **Actor secundario:** Servicio de IA (API).
* **Precondición:** El profesor se encuentra dentro del editor de cuestionarios.
* **Flujo principal:**
    1. El profesor activa el asistente de IA e introduce un tema o pega un texto base.
    2. El sistema envía la información a la API de IA externa.
    3. El sistema recibe y presenta al profesor un listado de preguntas y respuestas sugeridas.
    4. El profesor selecciona las preguntas que desea importar y las edita si es necesario.
    5. El sistema integra las preguntas seleccionadas en el cuestionario actual.

### CU-04: Administrar Sala
* **Actor principal:** Profesor.
* **Precondición:** El profesor está autenticado y ha seleccionado un cuestionario de su biblioteca.
* **Flujo principal:**
    1. El profesor solicita la creación de una nueva sala de juego.
    2. El sistema genera un PIN único de 6 dígitos y abre el socket de comunicación.
    3. El profesor visualiza en tiempo real la entrada de alumnos en la sala de espera.
    4. El profesor inicia el test, enviando la señal de comienzo a todos los alumnos.
    5. El profesor controla el paso de las preguntas o permite el avance automático.
    6. El profesor finaliza la sesión manualmente o al terminar las preguntas.

### CU-05: Unirse a sala y hacer el test
* **Actor principal:** Alumno.
* **Precondición:** Existe una sala activa y el alumno posee el código PIN.
* **Flujo principal:**
    1. El alumno introduce el PIN y un Nickname.
    2. El sistema valida el acceso y posiciona al alumno en la sala de espera.
    3. Al comenzar el test, el alumno recibe las preguntas de forma sincronizada con el resto de la clase.
    4. El alumno selecciona la opción deseada dentro del tiempo límite.
    5. El sistema registra la respuesta y el tiempo empleado.
    6. Al finalizar el cuestionario, el alumno recibe un código QR único de validación.
* **Flujo alternativo:** Si el alumno sufre una desconexión, puede reingresar con el mismo PIN y Nickname; el sistema restaurará su sesión y lo situará en la pregunta activa.

### CU-06: Ver Ranking en vivo
* **Actor principal:** Profesor / Alumno.
* **Precondición:** Se ha completado al menos una pregunta en una sala activa.
* **Flujo principal:**
    1. El sistema calcula la puntuación de cada alumno basándose en aciertos y velocidad de respuesta.
    2. El sistema actualiza el ranking global de la sala.
    3. El profesor visualiza el "Top 5" en la pantalla principal para motivar a la clase.
    4. El alumno visualiza su posición relativa y sus puntos en su propio dispositivo.

### CU-07: Validar nota mediante QR
* **Actor principal:** Profesor.
* **Actor secundario:** Alumno.
* **Precondición:** La sala ha finalizado y el alumno muestra el QR generado por el sistema.
* **Flujo principal:**
    1. El profesor selecciona la opción de "Validar Alumno" en su panel de sala.
    2. El profesor escanea el código QR del dispositivo del alumno.
    3. El sistema extrae el Token cifrado del QR y lo valida contra el registro provisional en el backend.
    4. Tras la validación positiva, el sistema cambia el estado del alumno a "Verificado".
    5. La nota se hace persistente y se vincula oficialmente al registro del alumno.

### CU-08: Consultar estadísticas
* **Actor principal:** Profesor.
* **Precondición:** Existen salas finalizadas con respuestas registradas.
* **Flujo principal:**
    1. El profesor accede al histórico de salas desde su panel.
    2. Selecciona una sesión específica para analizar.
    3. El sistema genera gráficas comparativas sobre el porcentaje de aciertos por pregunta.
    4. El profesor identifica las áreas de conocimiento donde los alumnos han tenido más dificultades.

### CU-09: Exportar resultados
* **Actor principal:** Profesor.
* **Precondición:** La sala ha finalizado y existen alumnos con estado "Verificado".
* **Flujo principal:**
    1. El profesor solicita la exportación de resultados desde el informe de la sala.
    2. El sistema filtra los registros para incluir únicamente a los alumnos validados presencialmente.
    3. El sistema genera un archivo en formato CSV o Excel.
    4. El archivo se descarga automáticamente en el dispositivo del profesor.

### CU-10: Responder pregunta
* **Actor principal:** Alumno.
* **Precondición:** El alumno está dentro de una sala activa y el profesor ha lanzado una pregunta.
* **Flujo principal:**
    1. El sistema muestra el enunciado y las opciones de respuesta en el dispositivo del alumno.
    2. El sistema inicia el cronómetro de cuenta atrás configurado para esa pregunta.
    3. El alumno selecciona una de las opciones antes de que el tiempo se agote.
    4. El sistema captura la opción elegida y registra el milisegundo exacto de la respuesta (timestamp).
    5. Al agotarse el tiempo o responder todos los alumnos, el sistema cierra la recepción de datos.
    6. El sistema compara la respuesta con la opción correcta definida en el cuestionario.
    7. El sistema calcula los puntos obtenidos basándose en el acierto y la bonificación por rapidez.
* **Flujo alternativo (Tiempo agotado):** Si el alumno no selecciona ninguna opción antes de que el cronómetro llegue a cero, el sistema registra la pregunta como "No contestada" con 0 puntos.
* **Postcondición:** El resultado de la pregunta se almacena temporalmente para actualizar el ranking en vivo.

## 4. Matriz de Trazabilidad (Casos de Uso vs RF)

Esta matriz permite verificar que cada requisito funcional está cubierto por al menos un caso de uso y viceversa, garantizando la integridad del diseño del sistema.

| Caso de Uso | Requisitos Funcionales (RF) Asociados |
| :--- | :--- |
| **CU-01: Autenticación** | RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 |
| **CU-02: Gestionar cuestionarios** | RF-07, RF-08, RF-12, RF-13, RF-14, RF-41 |
| **CU-03: Generar preguntas con IA** | RF-34, RF-35, RF-36, RF-37 |
| **CU-04: Administrar sala** | RF-10, RF-11, RF-15, RF-18, RF-19, RF-20 |
| **CU-05: Unirse a sala y hacer el test** | RF-16, RF-17, RF-40 |
| **CU-06: Ver Ranking en vivo** | RF-09, RF-24 |
| **CU-07: Validar nota mediante QR** | RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32 |
| **CU-08: Consultar estadísticas** | RF-33, RF-38 |
| **CU-09: Exportar resultados** | RF-39 |
| **CU-10: Responder pregunta** | RF-21, RF-22, RF-23 |
