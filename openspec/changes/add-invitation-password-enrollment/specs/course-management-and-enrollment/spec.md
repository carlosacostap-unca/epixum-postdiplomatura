## MODIFIED Requirements

### Requirement: Administración de cursos
El sistema MUST permitir que un administrador cree, edite y elimine cursos con título, descripción, fechas, estado, docentes, relaciones de contenido y una modalidad de matrícula `clave` o `invitacion_contrasena`.

#### Scenario: Creación de curso
- **WHEN** un administrador envía un título y datos válidos
- **THEN** se crea un curso en estado seleccionado o `borrador`
- **AND** las fechas de día completo se normalizan de forma estable
- **AND** la modalidad elegida determina el flujo disponible para nuevas matrículas

#### Scenario: Cambio de modalidad
- **WHEN** un administrador cambia la modalidad de un curso existente
- **THEN** las matrículas vigentes conservan su acceso
- **AND** las invitaciones existentes se conservan aunque sólo puedan activarse en modalidad `invitacion_contrasena`

#### Scenario: Eliminación de curso
- **WHEN** un administrador confirma la eliminación
- **THEN** el curso se elimina y la lista administrativa se revalida

### Requirement: Alcance docente
Un docente MUST ver y gestionar solamente los cursos en cuya relación `teachers` se encuentra asignado y MUST poder administrar la credencial de matrícula correspondiente sin cambiar la modalidad ni gestionar emails invitados.

#### Scenario: Curso asignado
- **WHEN** un docente abre uno de sus cursos
- **THEN** ve sus clases, trabajos, consultas y alumnos matriculados
- **AND** puede gestionar la clave o contraseña compartida según la modalidad vigente

#### Scenario: Curso no asignado
- **WHEN** un docente intenta abrir o modificar la credencial de un curso ajeno
- **THEN** el sistema rechaza la operación y lo redirige a su panel cuando corresponda

#### Scenario: Gestión de invitaciones
- **WHEN** un docente intenta cargar, listar o revocar emails autorizados
- **THEN** el sistema rechaza la operación porque esa gestión corresponde exclusivamente a administradores

### Requirement: Matrícula inmediata por clave
El sistema MUST matricular inmediatamente al estudiante que ingresa una clave válida únicamente cuando el curso no está en borrador y utiliza la modalidad `clave`.

#### Scenario: Clave correcta
- **WHEN** un estudiante autenticado ingresa una clave válida de un curso en modalidad `clave`
- **THEN** se crea una matrícula única para ese estudiante y curso
- **AND** el nuevo curso aparece en “Mis cursos” sin aprobación manual

#### Scenario: Clave incorrecta o curso no disponible
- **WHEN** la clave no coincide, el curso está en `borrador` o utiliza `invitacion_contrasena`
- **THEN** no se crea ninguna matrícula
- **AND** la interfaz informa que la clave no corresponde a un curso disponible sin revelar cursos restringidos

#### Scenario: Matrícula repetida
- **WHEN** el estudiante usa nuevamente la clave de un curso que ya posee
- **THEN** el sistema no duplica el registro
- **AND** comunica que ya estaba matriculado

### Requirement: Ausencia de solicitudes manuales
El sistema MUST NOT aceptar solicitudes de matrícula iniciadas por estudiantes ni requerir aprobación posterior; las únicas vías MUST ser la matrícula inmediata por clave o una invitación administrativa activada con contraseña.

#### Scenario: Curso por clave
- **WHEN** una persona busca sumarse a un curso con modalidad `clave`
- **THEN** utiliza la clave inmediata y no se crea una solicitud pendiente

#### Scenario: Curso con doble validación
- **WHEN** una persona busca acceder a un curso con `invitacion_contrasena`
- **THEN** sólo puede activar una invitación previamente creada por un administrador
- **AND** no existe un formulario para solicitar aprobación
