# Matrices de trazabilidad del sistema

Para garantizar la integridad del desarrollo, la calidad del software y demostrar el cumplimiento de los fines del proyecto, se establecen las siguientes matrices de trazabilidad. Estas herramientas permiten verificar de forma bidireccional que ningún elemento del sistema carece de justificación técnica y que toda meta estratégica está cubierta operacionalmente.

---

### 1. Matriz de trazabilidad: requisitos funcionales (RF) vs objetivos (OBJ)

Mapea directamente cómo las capacidades funcionales del sistema dan cumplimiento a los objetivos generales y específicos del proyecto.

| Requisitos funcionales (RF) | OBJ-01 | OBJ-02 | OBJ-03 | OBJ-04 | OBJ-05 | OBJ-06 | OBJ-07 | OBJ-08 | OBJ-09 | OBJ-10 | OBJ-11 | OBJ-12 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **RF-01: Gestión de registro** | X | | | | | | | | | | | |
| **RF-02: Inicio de sesión** | X | | | | | | | | | | | |
| **RF-03: Baja de usuarios** | X | | | | | | | | | | | |
| **RF-04: Recuperación contraseña** | X | | | | | | | | | | | |
| **RF-05: Edición perfil** | X | | | | | | | | | | | |
| **RF-06: Cierre de sesión** | X | | | | | | | | | | | |
| **RF-07: Crear cuestionario** | | X | | | | | | | | | | |
| **RF-08: Listar cuestionarios** | | X | | | | | | | | | | |
| **RF-09: Mostrar ranking** | | | | | | | | X | | | | |
| **RF-10: Aleatoriedad** | | X | | | | | | | | | | |
| **RF-11: Configurar tiempo** | | | X | | | | | | | | | |
| **RF-12: Importación** | | | | | | | | | | | | X |
| **RF-13: Edición de cuestionarios** | | X | | | | | | | | | | |
| **RF-14: Eliminación de datos** | | X | | | | | | | | | | |
| **RF-15: Crear sala** | | | X | | | | | | | | | |
| **RF-16: Validar PIN** | | | | X | | | | | | | | |
| **RF-17: Validar uvus** | | | | X | | | | | | | | |
| **RF-18: Sala de espera** | | | X | | | | | | | | | |
| **RF-19: Cerrar sala** | | | X | | | | | | | | | |
| **RF-20: Comenzar sala** | | | | | X | | | | | | | |
| **RF-21: Distribución síncrona** | | | | | X | | | | | | | |
| **RF-22: Temporizador servidor** | | | X | | | | | | | | | |
| **RF-23: Recepción respuestas** | | | | | X | | | | | | | |
| **RF-24: Feedback inmediato** | | | | | X | | | | | | | |
| **RF-25: Registro provisional** | | | | | | | X | | | | | |
| **RF-26: Generación QR** | | | | | | X | | | | | | |
| **RF-27: Activación cámara** | | | | | | | | | | X | | |
| **RF-28: Lectura de QR** | | | | | | | | | | X | | |
| **RF-29: Validación token** | | | | | | X | | | | | | |
| **RF-30: Control de estado** | | | | | | | X | | | | | |
| **RF-31: Check verificación** | | | | | | | X | | | | | |
| **RF-32: Listado en vivo** | | | | | | | | X | | | | |
| **RF-33: Estadísticas de sala** | | | | | | | | X | | | | |
| **RF-34: Generación por IA** | | | | | | | | | X | | | |
| **RF-35: Asistente de ayuda** | | | | | | | | | X | | | |
| **RF-36: Navegación por IA** | | | | | | | | | X | | | |
| **RF-37: Revisión post IA** | | | | | | | | | X | | | |
| **RF-38: Crear clase** | | | | | | | | | | | X | |
| **RF-39: Exportación resultados** | | | | | | | | | | | | X |
| **RF-40: Gestión de conexiones** | | | | | X | | | | | | | |
| **RF-41: Filtros de búsqueda** | | X | | | | | | | | | | |
| **RF-42: Bonificación por tiempo** | | | | | X | | | | | | | |
| **RF-43: Sistema de rachas** | | | | | X | | | | | | | |
| **RF-44: Modo de puntuación** | | | X | | | | | | | | | |
| **RF-45: Visibilidad de ranking** | | | X | | | | | | | | | |
| **RF-46: Formulario avanzado** | | X | | | | | | | | | | |
| **RF-47: Historial de salas** | | | | | | | X | | | | | |

---

### 2. Matriz de trazabilidad: calidad e información vs objetivos funcionales

Mapea cómo la arquitectura de persistencia de datos (requisitos de información) y los atributos de calidad (requisitos no funcionales) sostienen los objetivos del proyecto.

| Requisito técnico / de datos | OBJ-01 | OBJ-02 | OBJ-03 | OBJ-04 | OBJ-05 | OBJ-06 | OBJ-07 | OBJ-08 | OBJ-09 | OBJ-10 | OBJ-11 | OBJ-12 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **RI-01: Información de usuarios (profesores)** | X | | | | | | | | | | | |
| **RI-02: Estructura de cuestionarios y preguntas** | | X | | | | | | | X | | | |
| **RI-03: Datos de salas y estados síncronos** | | | X | X | X | | | | | | | |
| **RI-04: Registro de respuestas y notas provisionales**| | | | | X | X | X | X | | | | |
| **RI-05: Historial consolidado de sesiones** | | | | | | | X | X | | | | X |
| **RI-06: Estructura de clases y grupos** | | | | | | | | | | | X | X |
| **RNF-01: Sincronización en tiempo real** | | | | | X | | | | | | | |
| **RNF-02: Concurrencia de 100 alumnos** | | | | | X | | | | | | | |
| **RNF-03: Integridad criptográfica del QR** | | | | | | X | X | | | | | |
| **RNF-04: Privacidad y hashing de claves** | X | | | | | | | | | | | |
| **RNF-05: Cifrado HTTPS y WSS** | X | | | | X | | | | | | | |
| **RNF-06: Responsividad de la interfaz** | X | X | | X | X | | | | | | | |
| **RNF-07: Eficiencia en el escaneo QR** | | | | | | | | | | X | | |
| **RNF-08: Reconexión adaptativa de alumnos** | | | | | X | | | | | | | |
| **RNF-09: Persistencia ante fallos del servidor** | | | X | | X | | X | | | | | |
| **RNF-10: Modularidad de la arquitectura** | X | X | X | X | X | X | X | X | X | X | X | X |

---


### 3. Matriz de trazabilidad: objetivos funcionales (OBJ) vs casos de uso (CU)

Permite verificar de forma directa cómo los objetivos estratégicos del sistema se materializan en los casos de uso lógicos que definen el comportamiento de la aplicación.

| Objetivo funcional (OBJ) | Casos de uso (CU) amparados |
| :--- | :--- |
| **OBJ-01:** Módulo de usuario y autenticación | **CU-01:** Iniciar sesión como docente |
| **OBJ-02:** Gestión de cuestionarios | **CU-02:** Gestionar cuestionarios |
| **OBJ-03:** Creación de salas | **CU-04:** Administrar sala en vivo |
| **OBJ-04:** Acceso rápido | **CU-05:** Unirse a sala y realizar test |
| **OBJ-05:** Interacción en tiempo real | **CU-05:** Unirse a sala y realizar test <br><br> **CU-10:** Responder pregunta |
| **OBJ-06:** Verificación QR | **CU-07:** Validar calificación mediante QR |
| **OBJ-07:** Persistencia validada | **CU-07:** Validar calificación mediante QR |
| **OBJ-08:** Estadísticas y análisis | **CU-06:** Visualizar ranking en vivo <br><br> **CU-08:** Consultar estadísticas |
| **OBJ-09:** Asistente IA | **CU-03:** Generar preguntas con IA |
| **OBJ-10:** Escaneo de código QR | **CU-07:** Validar calificación mediante QR |
| **OBJ-11:** Gestión de grupos | **CU-11:** Gestionar grupos |
| **OBJ-12:** Exportación de datos | **CU-09:** Exportar resultados |

---
### 4. Matriz de trazabilidad: casos de uso (CU) vs historias de usuario (HU)

| Caso de uso (CU) general | Historias de usuario (HU) amparadas |
| :--- | :--- |
| **CU-01:** Iniciar sesión como docente | **HU-01:** (Docente) Gestión de cuenta (Registro, acceso y perfil) |
| **CU-02:** Gestionar cuestionarios | **HU-01:** (Docente) Crear y organizar cuestionarios personalizados <br><br> **HU-02:** (Docente) Editar cuestionarios existentes <br><br> **HU-13:** (Docente) Añadir etiquetas e imágenes avanzados |
| **CU-03:** Generar preguntas con IA | **HU-09:** (Docente) Generar borradores de preguntas mediante IA |
| **CU-04:** Administrar sala en vivo | **HU-03:** (Docente) Crear y administrar sala con PIN único <br><br> **HU-05:** (Docente) Cerrar la sala una vez iniciada la actividad <br><br> **HU-11:** (Docente) Configurar puntos extra por rapidez o racha <br><br> **HU-12:** (Docente) Decidir visibilidad intermedia del ranking |
| **CU-05:** Unirse a sala y realizar test | **HU-15:** (Alumno) Unirse a sala con PIN y apodo sin necesidad de registro |
| **CU-06:** Visualizar ranking en vivo | **HU-04:** (Docente) Ver en tiempo real quién se conecta y progresa <br><br> **HU-12:** (Docente) Mostrar pantalla global de ranking |
| **CU-07:** Validar calificación mediante QR | **HU-06:** (Docente) Escanear móvil del alumno para validar nota <br><br> **HU-18:** (Alumno) Generación de código QR único al finalizar |
| **CU-08:** Consultar estadísticas | **HU-08:** (Docente) Visualizar estadísticas de acierto por pregunta <br><br> **HU-14:** (Docente) Acceder al historial de salas pasadas |
| **CU-09:** Exportar resultados | **HU-10:** (Docente) Exportar resultados verificados a CSV |
| **CU-10:** Responder pregunta | **HU-16:** (Alumno) Recibir preguntas y opciones síncronas <br><br> **HU-17:** (Alumno) Saber si la respuesta es correcta (Feedback) |
| **CU-11:** Gestionar grupos | **HU-07:** (Docente) Crear grupos o clases estructuradas |

---

### 5. Matriz de trazabilidad: requisitos funcionales (RF) vs historias de usuario (HU)

Vincula el desarrollo bajo metodologías ágiles (*backlog* de usuario) con las especificaciones técnicas del contrato de software.

| Historia de usuario / Épica (HU) | Requisitos funcionales (RF) asociados |
| :--- | :--- |
| **HU-01: Gestión de cuenta docente** | RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 |
| **HU-02: Creación manual de cuestionarios** | RF-07, RF-08, RF-10, RF-13, RF-14, RF-41, RF-46 |
| **HU-03: Generación asistida con IA** | RF-34, RF-35, RF-36, RF-37 |
| **HU-04: Control de sala en vivo** | RF-11, RF-15, RF-18, RF-19, RF-20, RF-22, RF-44, RF-45 |
| **HU-05: Participación del estudiante** | RF-16, RF-17, RF-40 |
| **HU-06: Ejecución de la prueba interactiva** | RF-21, RF-23, RF-24, RF-42, RF-43 |
| **HU-07: Identificación criptográfica por QR** | RF-25, RF-26 |
| **HU-08: Verificación presencial docente** | RF-27, RF-28, RF-29, RF-30, RF-31 |
| **HU-09: Analítica de sesión en tiempo real** | RF-09, RF-32, RF-33 |
| **HU-10: Organización académica de clases** | RF-38 |
| **HU-11: Explotación y descarga de datos** | RF-12, RF-39, RF-47 |

---

### 6. Matriz de trazabilidad unificada del sistema

| Grupo de entidades (Módulo de datos) | Objetivos funcionales (OBJ) | Casos de uso (CU) asociados | Historias de usuario (HU) asociadas | Requisitos funcionales (RF) asociados |
| :--- | :--- | :--- | :--- | :--- |
| **Módulo de contenido** | **OBJ-02:** Gestión de cuestionarios | **CU-02:** Gestionar cuestionarios | **HU-01:** Crear y organizar cuestionarios personalizados | RF-07, RF-08, RF-10, RF-12 |
| | | | **HU-02:** Editar cuestionarios existentes | RF-13, RF-14, RF-41 |
| | | | **HU-13:** Añadir etiquetas e imágenes avanzados | RF-46 |
| | **OBJ-03:** Creación de salas | **CU-04:** Administrar sala en vivo | **HU-03:** Crear y administrar sala con PIN único | RF-11, RF-15, RF-18, RF-22 |
| | | | **HU-05:** Cerrar la sala una vez iniciada la actividad | RF-19 |
| | | | **HU-11:** Configurar puntos extra por rapidez o racha | RF-42, RF-43, RF-44 |
| | | | **HU-12:** Decidir visibilidad intermedia del ranking | RF-45 |
| | **OBJ-04:** Acceso rápido | **CU-05:** Unirse a sala y realizar test | **HU-15:** Unirse a sala con PIN y apodo sin necesidad de registro | RF-16, RF-17, RF-40 |
| | **OBJ-05:** Interacción en tiempo real | **CU-05:** Unirse a sala y realizar test | **HU-15:** Unirse a sala con PIN y apodo sin necesidad de registro | RF-16, RF-17, RF-40 |
| | | **CU-10:** Responder pregunta | **HU-16:** Recibir preguntas y opciones síncronas | RF-20, RF-21 |
| | | | **HU-17:** Saber si la respuesta es correcta (Feedback) | RF-23, RF-24, RF-42, RF-43 |
| | **OBJ-06:** Verificación QR | **CU-07:** Validar calificación mediante QR | **HU-06:** Escanear móvil del alumno para validar nota | RF-27, RF-28, RF-29, RF-30, RF-31 |
| | | | **HU-18:** Generación de código QR único al finalizar | RF-25, RF-26 |
| | **OBJ-07:** Persistencia validada | **CU-07:** Validar calificación mediante QR | **HU-06:** Escanear móvil del alumno para validar nota | RF-27, RF-28, RF-29, RF-30, RF-31 |
| | | | **HU-18:** Generación de código QR único al finalizar | RF-25, RF-26 |
| | **OBJ-08:** Estadísticas y análisis | **CU-06:** Visualizar ranking en vivo | **HU-04:** Ver en tiempo real quién se conecta y progresa | RF-32 |
| | | | **HU-12:** Mostrar pantalla global de ranking | RF-09 |
| | | **CU-08:** Consultar estadísticas | **HU-08:** Visualizar estadísticas de acierto por pregunta | RF-33 |
| | | | **HU-14:** Acceder al historial de salas pasadas | RF-47 |
| | **OBJ-09:** Asistente IA | **CU-03:** Generar preguntas con IA | **HU-09:** Generar borradores de preguntas mediante IA | RF-34, RF-35, RF-36, RF-37 |
| | **OBJ-10:** Escaneo de código QR | **CU-07:** Validar calificación mediante QR | **HU-06:** Escanear móvil del alumno para validar nota | RF-27, RF-28, RF-29, RF-30, RF-31 |
| | | | **HU-18:** Generación de código QR único al finalizar | RF-25, RF-26 |
| | **OBJ-12:** Exportación de datos | **CU-09:** Exportar resultados | **HU-10:** Exportar resultados verificados a CSV | RF-39 |
| **Módulo de usuarios** | **OBJ-01:** Módulo de usuario y autenticación | **CU-01:** Iniciar sesión como docente | **HU-01:** Gestión de cuenta docente (Registro, acceso y perfil) | RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 |
| | **OBJ-11:** Gestión de grupos | **CU-11:** Gestionar grupos | **HU-07:** Crear grupos o clases estructuradas | RF-38 |
