## ADDED Requirements

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

## MODIFIED Requirements

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
