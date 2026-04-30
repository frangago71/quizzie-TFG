# Especificación de Requisitos del Sistema

## 1. Objetivos del sistema
Definen las metas globales que el proyecto debe alcanzar para ser considerado exitoso.

| ID | Nombre | Descripción |
| :--- | :--- | :--- |
| **OBJ-01** | Módulo de usuario y autenticación | Proveer un sistema de autenticación seguro para profesores. |
| **OBJ-02** | Gestión de cuestionarios | Permitir la creación, edición y configuración de cuestionarios de preguntas. |
| **OBJ-03** | Creación de salas | Habilitar sesiones de test únicas identificadas mediante un código PIN. |
| **OBJ-04** | Acceso rápido | Permitir el acceso de alumnos a las salas mediante PIN y Nickname sin registro. |
| **OBJ-05** | Interacción en tiempo real | Sincronizar el estado de la partida y preguntas entre dispositivos. |
| **OBJ-06** | Verificación QR | Generar comprobante digital QR para validación presencial por el profesor. |
| **OBJ-07** | Persistencia validada | Almacenar en histórico solo los resultados verificados físicamente. |
| **OBJ-08** | Estadísticas y análisis | Visualizar estadísticas de rendimiento basadas en datos validados. |
| **OBJ-09** | Asistente IA | Integrar IA para generar preguntas automáticamente según temáticas. |
| **OBJ-10** | Escaneo de código QR | Habilitar el uso de la cámara para la lectura ágil de códigos QR. |
| **OBJ-11** | Gestión de grupos | Organizar alumnos en clases para seguimiento histórico. |
| **OBJ-12** | Exportación de datos | Permitir la descarga de resultados en formatos CSV/Excel. |

## 2. Requisitos Funcionales (RF)
Listado detallado de las capacidades del sistema, trazadas con su correspondiente Issue de desarrollo.

| ID | Issue | Nombre | Descripción | Prioridad | Objetivo | Fase |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| **RF-01** | #58 | Gestión de registro | Registro de nuevos profesores con validación de email y hash de contraseña. | Alta | OBJ-01 |  |
| **RF-02** | #37 | Inicio de sesión | Autenticación mediante email y contraseña cifrada (JWT). | Alta | OBJ-01 | Core |
| **RF-03** | #59 | Baja de usuarios | Eliminación de cuenta y datos asociados de forma permanente. | Media | OBJ-01 |  |
| **RF-04** | #60 | Recuperación contraseña | Solicitud de reseteo de contraseña vía email. | Baja | OBJ-01 |  |
| **RF-05** | #61 | Edición perfil | Modificación de nombre visible y contraseña. | Media | OBJ-01 |  |
| **RF-06** | #38 | Cierre de sesión | Invalidación del token y redirección al login. | Alta | OBJ-01 | Core |
| **RF-07** | #1 | Crear cuestionario | Creación de cuestionarios de preguntas sin límite de cantidad. | Alta | OBJ-02 | MVP |
| **RF-08** | #2 | Listar cuestionarios | Visualización de cuestionarios ordenados por fecha. | Alta | OBJ-02 | MVP |
| **RF-09** | #39 | Mostrar ranking | Ranking de alumnos después de cada pregunta y al final. | Media | OBJ-08 | Core |
| **RF-10** | #62 | Aleatoriedad | Opción para cambiar el orden de preguntas y respuestas. | Baja | OBJ-02 | |
| **RF-11** | #63 | Configurar tiempo | Definición del tiempo de respuesta al crear la sala. | Media | OBJ-03 |  |
| **RF-12** | # | Importación | Carga de preguntas y respuestas desde archivos .txt o .csv. | Media | OBJ-12 | |
| **RF-13** | #51 | Edición de cuestionarios y preguntas | Permitir editar el título, descripción, preguntas y opciones. | Media | OBJ-02 |Core |
| **RF-14** | #40 | Eliminación de datos | Borrado lógico de cuestionarios o preguntas. | Media | OBJ-02 | Core |
| **RF-15** | #3 | Crear sala | Instanciación de una sesión con PIN único basada en un cuestionario. | Alta | OBJ-03 | MVP |
| **RF-16** | #4 | Validar PIN | Verificación de que el PIN corresponde a una sala activa. | Alta | OBJ-04 | MVP |
| **RF-17** | #5 | Validar Nickname | Control de duplicados, formato y palabras prohibidas. | Alta | OBJ-04 | MVP |
| **RF-18** | #6 | Sala de espera | Mantenimiento de alumnos en espera hasta el inicio. | Alta | OBJ-03 | MVP |
| **RF-19** | #41 | Cerrar sala | Finalización de sala, ver resultados y desconexión automática. | Media | OBJ-03 | Core |
| **RF-20** | #7 | Comenzar sala | Cuenta atrás y comienzo de la sucesión de preguntas. | Alta | OBJ-05 | MVP |
| **RF-21** | #8 | Distribución | Envío de la secuencia de preguntas a los alumnos conectados. | Alta | OBJ-05 | MVP |
| **RF-22** | #9 | Temporizador servidor | Control del tiempo de respuesta en el backend. | Alta | OBJ-03 | Core |
| **RF-23** | #10 | Recepción respuestas | Captura de la opción respondida. | Alta | OBJ-05 | MVP |
| **RF-24** | #11 | Feedback inmediato | Indicación de acierto/fallo sin mostrar nota final aún. | Alta | OBJ-05 | MVP |
| **RF-25** | #42 | Registro provisional | Registro de resultado de alumno "No Verificado" y generación de Token único. | Alta | OBJ-07 | Core |
| **RF-26** | #43 | Generación QR | QR en el dispositivo del alumno con Nickname y Token. | Alta | OBJ-06 | Core |
| **RF-27** | #44 | Activación cámara | Solicitud de permisos en el profesor para escanear. | Alta | OBJ-10 | Core |
| **RF-28** | #45 | Lectura de QR | Lectura y extracción de datos Usuario + Token. | Alta | OBJ-10 | Core |
| **RF-29** | #46 | Validación Token | Comparación del Token escaneado con el del servidor. | Alta | OBJ-06 | Core |
| **RF-30** | #47 | Control de estado | Impedimento de validar nota si ya consta como "Verificado". | Alta | OBJ-07 | Core |
| **RF-31** | #48 | Check verificación | Actualización a estado verificado y oficialización de nota. | Alta | OBJ-07 | Core |
| **RF-32** | # | Listado en vivo | Actualización en tiempo real de alumnos verificados en pantalla. | Media | OBJ-08 | |
| **RF-33** | # | Estadísticas | Porcentaje de aciertos por pregunta para detectar temas difíciles. | Media | OBJ-08 | |
| **RF-34** | # | Generación preguntas | Procesamiento de tema o texto para generar preguntas vía IA. | Media | OBJ-09 | |
| **RF-35** | # | Asistente de ayuda | Interpretación de preguntas en lenguaje natural sobre la web. | Baja | OBJ-09 | |
| **RF-36** | # | Navegación y tutorial por IA | Detección de intenciones de navegación y explicación del funcionamiento de la app vía IA. | Baja | OBJ-09 | |
| **RF-37** | # | Revisión post IA | Presentación de contenido generado por IA para validación manual. | Media | OBJ-09 | |
| **RF-38** | # | Crear clase | Agrupación de alumnos o resultados bajo etiqueta de clase. | Baja | OBJ-11 | |
| **RF-39** | #64 | Exportación CSV | Generación de archivo descargable con los resultados. | Alta | OBJ-12 | |
| **RF-40** | #49 | Gestión de desconexiones y reconexiones | Manejo de unirse tarde, desconexiones y borrado al abandonar. | Media | OBJ-05 | Core |
| **RF-41** | #50 | Filtros en listar cuestionarios | Filtrado por inactivos, nuevos o todos. | Media | OBJ-02 | Core |
| **RF-42** | # | Bonificación por tiempo | Cálculo de puntos extra en función del tiempo empleado en responder. | Baja | OBJ-05 | |
| **RF-43** | # | Sistema de rachas | Bonificación de puntos por encadenar respuestas correctas consecutivas. | Baja | OBJ-05 | |
| **RF-44** | # | Configuración de puntuación | Elección del modo de puntuación (estándar o con bonificaciones) al crear la sala. | Baja | OBJ-03 | |
| **RF-45** | #65 | Visibilidad del ranking | Opción para activar o desactivar la visualización del ranking entre preguntas. | Baja | OBJ-03 | |
| **RF-46** | # | Creación/edición de cuestionarios avanzada | Inclusión de etiquetas (tags) e imágenes en el formulario de creación y edición. | Baja | OBJ-02 | |
| **RF-47** | #66| Historial de salas | Registro de salas finalizadas con acceso a los resultados y estadísticas históricas. | Alta | OBJ-07 | Core |

## 3. Requisitos No Funcionales (RNF)
Definen los atributos de calidad y restricciones técnicas del sistema.

| ID | Atributo | Definición del Requisito |
| :--- | :--- | :--- |
| **RNF-01** | Rendimiento | **Latencia:** Los eventos en tiempo real deben procesarse en menos de 200ms para asegurar la sincronía. |
| **RNF-02** | Rendimiento | **Concurrencia:** Soporte mínimo de 100 alumnos por sala sin pérdida de rendimiento. |
| **RNF-03** | Seguridad | **Integridad:** El Token de validación del alumno debe ser criptográficamente seguro y no falsificable. |
| **RNF-04** | Seguridad | **Privacidad:** Almacenamiento obligatorio de contraseñas mediante algoritmos de hashing seguros. |
| **RNF-05** | Seguridad | **Cifrado:** Uso de protocolos HTTPS y WSS para proteger la comunicación de red. |
| **RNF-06** | Usabilidad | **Responsividad:** Interfaz adaptativa (Responsive) optimizada para móviles y ordenadores. |
| **RNF-07** | Usabilidad | **Eficiencia QR:** Tiempo de escaneo y validación del código QR inferior a 2 segundos. |
| **RNF-08** | Fiabilidad | **Reconexión:** Capacidad de recuperar la sesión de un alumno tras una desconexión accidental. |
| **RNF-09** | Disponibilidad | **Persistencia:** Respaldo de resultados temporales ante posibles caídas del servidor. |


## 4. Historias de Usuario (HU)

### 4.1 Profesor

* **HU-01:** **Como** *profesor*, **quiero** crear y organizar mis propios cuestionarios **para** disponer de un repositorio de actividades personalizado por asignatura o tema.
* **HU-02:** **Como** *profesor*, **quiero** poder editar mis cuestionarios existentes **para** corregir errores o crear variantes rápidas para diferentes grupos.
* **HU-03:** **Como** *profesor*, **quiero** crear y administrar una sala con un PIN único **para** controlar el acceso de los alumnos y decidir cuándo comienza el test.
* **HU-04:** **Como** *profesor*, **quiero** ver en tiempo real qué están respondiendo los alumnos y quiénes se van conectando **para** llevar un control del progreso de la clase.
* **HU-05:** **Como** *profesor*, **quiero** poder cerrar la sala una vez iniciada la actividad **para** que ningún alumno se una tarde o de forma externa.
* **HU-06:** **Como** *profesor*, **quiero** escanear el móvil del alumno **para** confirmar su presencia física y validar su nota en el sistema evitando respuestas no autorizadas.
* **HU-07:** **Como** *profesor*, **quiero** crear grupos o clases **para** tener organizados a mis alumnos y facilitar el volcado de notas histórico.
* **HU-08:** **Como** *profesor*, **quiero** visualizar estadísticas de acierto por pregunta al finalizar **para** detectar conceptos que no han quedado claros y reforzarlos.
* **HU-09:** **Como** *profesor*, **quiero** generar borradores de preguntas mediante IA **para** reducir el tiempo de preparación de mis clases.
* **HU-10:** **Como** *profesor*, **quiero** exportar los resultados verificados a CSV **para** integrarlos en mis herramientas de gestión docente externas.
* **HU-17:** **Como** *profesor*, **quiero** configurar si se otorgan puntos extra por rapidez o racha **para** adaptar el nivel de competitividad de la sesión.
* **HU-18:** **Como** *profesor*, **quiero** decidir si el ranking se muestra tras cada pregunta **para** gestionar el ritmo y la atención de la clase.
* **HU-19:** **Como** *profesor*, **quiero** añadir etiquetas e imágenes a mis cuestionarios **para** identificarlos y personalizarlos visualmente.
* **HU-20:** **Como** *profesor*, **quiero** acceder al historial de salas pasadas **para** revisar resultados y analizar el progreso de mis alumnos en el tiempo.

### 4.2 Alumno
* **HU-11:** **Como** *alumno*, **quiero** unirme a una sala solo con un PIN y un apodo **para** participar de forma inmediata sin necesidad de crear una cuenta.
* **HU-12:** **Como** *alumno*, **quiero** recibir la pregunta y las opciones de respuesta en mi móvil de forma sincronizada **para** competir en igualdad de condiciones con mis compañeros.
* **HU-13:** **Como** *alumno*, **quiero** saber si mi respuesta ha sido correcta justo después de enviarla **para** reforzar mi aprendizaje en el momento.
* **HU-14:** **Como** *alumno*, **quiero** que se genere un código QR único al finalizar el test **para** mostrárselo al profesor y que mi nota sea oficializada.
* **HU-15:** **Como** *alumno*, **quiero** ver mi posición en el ranking después de cada bloque de preguntas **para** motivarme durante la realización del cuestionario.
* **HU-16:** **Como** *alumno*, **quiero** poder reengancharme a la partida si pierdo la conexión a internet **para** no perder mi progreso y poder terminar el test.
* **HU-21:** **Como** *alumno*, **quiero** recibir puntos extra por responder rápido o mantener una racha de aciertos **para** sentirme recompensado por mi agilidad y constancia.
