# Cursos y matrículas

## Purpose
Definir el ciclo de vida de cursos, su asignación docente y la matriculación inmediata de estudiantes mediante claves seguras.

## Requirements

### Requirement: Administración de cursos
El sistema MUST permitir que un administrador cree, edite y elimine cursos con título, descripción, fechas, estado, docentes y relaciones de contenido.

#### Scenario: Creación de curso
- **WHEN** un administrador envía un título y datos válidos
- **THEN** se crea un curso en estado seleccionado o `borrador`
- **AND** las fechas de día completo se normalizan de forma estable

#### Scenario: Eliminación de curso
- **WHEN** un administrador confirma la eliminación
- **THEN** el curso se elimina y la lista administrativa se revalida

### Requirement: Configuración administrativa de contenidos independientes
El sistema MUST permitir únicamente a un administrador habilitar o deshabilitar los contenidos independientes de cada curso. La configuración MUST estar deshabilitada por defecto para cursos nuevos y existentes.

#### Scenario: Creación de curso
- **WHEN** un administrador crea un curso sin habilitar explícitamente los contenidos independientes
- **THEN** el curso se guarda con la característica deshabilitada

#### Scenario: Cambio administrativo
- **WHEN** un administrador edita un curso y cambia la configuración de contenidos independientes
- **THEN** el nuevo valor se aplica a las vistas y accesos de docentes y estudiantes

#### Scenario: Actor no administrador
- **WHEN** un docente o estudiante intenta cambiar la configuración directamente
- **THEN** el sistema rechaza la operación aunque la solicitud evite el formulario administrativo

#### Scenario: Compatibilidad de cursos existentes
- **WHEN** se incorpora la configuración a un curso existente
- **THEN** su valor inicial es deshabilitado
- **AND** sus clases, trabajos, semanas, consultas y matrículas permanecen sin cambios

### Requirement: Asignación docente contextual
El sistema MUST permitir que un administrador asigne como docente de un curso a cualquier cuenta autenticada que no esté matriculada en ese mismo curso, sin exigir que posea previamente un rol global `docente`.

#### Scenario: Asignación compatible
- **WHEN** un administrador selecciona una persona que no está matriculada en el curso
- **THEN** el sistema la incorpora a `teachers`
- **AND** la persona obtiene acceso docente solamente a ese curso

#### Scenario: Asignación incompatible
- **WHEN** un administrador selecciona una persona matriculada en el mismo curso
- **THEN** el sistema rechaza la asignación sin retirar su matrícula

#### Scenario: Participación estudiantil en otro curso
- **WHEN** la persona seleccionada está matriculada como estudiante en un curso diferente
- **THEN** el sistema permite asignarla como docente
- **AND** conserva todas sus matrículas anteriores

### Requirement: Matrícula administrativa directa
El sistema MUST permitir que un administrador matricule directamente cuentas existentes en un curso sin exigir la clave o contraseña compartida, validando identidad, curso, unicidad y ausencia de asignación docente en ese mismo curso antes de persistir cada matrícula.

#### Scenario: Matrícula administrativa compatible
- **WHEN** un administrador selecciona una cuenta existente que no está matriculada ni enseña en el curso
- **THEN** el sistema crea una única matrícula para esa persona y curso
- **AND** conserva todas sus participaciones en otros cursos

#### Scenario: Cuenta ya matriculada
- **WHEN** el administrador intenta agregar una cuenta que ya posee matrícula en el curso
- **THEN** el sistema no crea un registro duplicado
- **AND** informa que la participación ya estaba vigente

#### Scenario: Docente del mismo curso
- **WHEN** el administrador intenta matricular a una persona incluida en `teachers` del mismo curso
- **THEN** el sistema rechaza la operación
- **AND** conserva intacta la asignación docente

### Requirement: Retiro administrativo de participaciones
El sistema MUST permitir que un administrador retire explícitamente una matrícula o asignación docente del curso, y MUST NOT borrar la cuenta, invitaciones, entregas, consultas, respuestas, evaluaciones, archivos ni participaciones en otros cursos.

#### Scenario: Baja de matrícula
- **WHEN** un administrador confirma retirar una matrícula vigente
- **THEN** se elimina solamente el registro de `course_enrollments` seleccionado
- **AND** la persona deja de tener acceso estudiantil futuro a ese curso

#### Scenario: Baja de asignación docente
- **WHEN** un administrador confirma retirar una asignación docente vigente
- **THEN** se elimina solamente a esa persona de `courses.teachers`
- **AND** deja de tener acceso docente futuro a ese curso salvo que posea privilegio global de administrador

#### Scenario: Conversión de participación
- **WHEN** el administrador desea cambiar a una persona entre alumno y docente dentro del mismo curso
- **THEN** el sistema exige retirar explícitamente la participación vigente antes de crear la nueva
- **AND** no realiza conversiones silenciosas o implícitas

### Requirement: Alcance docente
Una persona asignada como docente MUST ver y gestionar solamente los cursos en cuya relación `teachers` se encuentra incluida y MUST poder administrar la credencial de matrícula correspondiente sin cambiar la modalidad ni gestionar emails invitados, con independencia del valor global `docente` o `estudiante` conservado por compatibilidad.

#### Scenario: Curso asignado
- **WHEN** una persona abre un curso donde está incluida en `teachers`
- **THEN** ve sus clases, trabajos, consultas y alumnos matriculados
- **AND** puede gestionar la clave o contraseña compartida según la modalidad vigente

#### Scenario: Curso no asignado
- **WHEN** una persona intenta abrir o modificar la credencial de un curso donde no está incluida en `teachers`
- **THEN** el sistema rechaza la operación y la redirige a su panel cuando corresponda

#### Scenario: Gestión de invitaciones
- **WHEN** una persona con asignación docente intenta cargar, listar o revocar emails autorizados
- **THEN** el sistema rechaza la operación porque esa gestión corresponde exclusivamente a administradores

### Requirement: Mis cursos del estudiante
El espacio de estudio MUST obtener los cursos de la persona exclusivamente desde `course_enrollments` y MUST ayudar a continuar el aprendizaje mediante estado, próxima actividad y acceso directo, aunque la misma cuenta posea asignaciones docentes en otros cursos.

#### Scenario: Cursos matriculados
- **WHEN** una persona abre Mis cursos
- **THEN** aparecen solamente los cursos relacionados con matrículas propias
- **AND** cada tarjeta muestra su estado y permite ingresar al contenido autorizado

#### Scenario: Catálogo personal extenso
- **WHEN** la persona posee varios cursos como estudiante
- **THEN** puede buscar por título y filtrar por estado sin ver cursos no matriculados

#### Scenario: Sin matrículas
- **WHEN** la persona no tiene registros de matrícula
- **THEN** se muestra un estado vacío que explica cómo obtener una clave o activar una invitación
- **AND** la acción Sumarse a un curso queda disponible dentro del mismo contexto

### Requirement: Matrícula inmediata por clave
El sistema MUST matricular inmediatamente a la persona autenticada que ingresa una clave válida únicamente cuando el curso no está en borrador, utiliza la modalidad `clave` y no la incluye en `teachers`, sin exigir un rol global `estudiante`.

#### Scenario: Clave correcta
- **WHEN** una persona autenticada que no enseña en el curso ingresa una clave válida de un curso en modalidad `clave`
- **THEN** se crea una matrícula única para esa persona y curso
- **AND** la interfaz confirma el nombre del curso y ofrece abrirlo inmediatamente

#### Scenario: Clave incorrecta o curso no disponible
- **WHEN** la clave no coincide, el curso está en `borrador` o utiliza `invitacion_contrasena`
- **THEN** no se crea ninguna matrícula
- **AND** el campo conserva el foco y muestra un error accionable sin revelar cursos restringidos

#### Scenario: Matrícula repetida
- **WHEN** la persona usa nuevamente la clave de un curso que ya posee
- **THEN** el sistema no duplica el registro
- **AND** comunica que ya estaba matriculada y ofrece abrir el curso

#### Scenario: Docente del mismo curso
- **WHEN** una persona incluida en `teachers` ingresa una clave válida del mismo curso
- **THEN** no se crea una matrícula
- **AND** la interfaz explica que no puede estudiar y enseñar dentro del mismo curso

### Requirement: Protección y rotación de claves
Las claves MUST tener entre 6 y 64 caracteres, MUST compararse normalizadas sin distinguir mayúsculas y MUST almacenarse únicamente como HMAC-SHA256 con un secreto de servidor.

#### Scenario: Docente cambia una clave
- **WHEN** un docente asignado guarda una nueva clave válida
- **THEN** se reemplaza `enrollmentKeyHash`
- **AND** la clave anterior deja de matricular inmediatamente

#### Scenario: Exposición de datos
- **WHEN** se consulta un curso o una matrícula mediante la API normal
- **THEN** PocketBase no serializa los hashes marcados como ocultos

### Requirement: Ausencia de solicitudes manuales
El sistema MUST NOT crear, mostrar ni procesar formularios o solicitudes de matrícula pendientes.

#### Scenario: Flujo vigente
- **WHEN** una persona busca sumarse a un curso
- **THEN** la única vía funcional es la clave inmediata
- **AND** no existe la colección `enrollment_requests`
