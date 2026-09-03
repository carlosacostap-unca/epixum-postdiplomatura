## ADDED Requirements

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
