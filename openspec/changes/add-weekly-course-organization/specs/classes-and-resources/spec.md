## MODIFIED Requirements

### Requirement: Gestión de clases
Los docentes asignados y administradores MUST poder crear, editar y eliminar clases con título, descripción, fecha, hora, curso y una semana opcional perteneciente al mismo curso.

#### Scenario: Nueva clase de curso tradicional
- **WHEN** un docente autorizado crea una clase desde un curso tradicional
- **THEN** la clase queda relacionada directamente con ese curso
- **AND** la fecha y hora se almacenan como ISO

#### Scenario: Nueva clase de curso semanal
- **WHEN** un docente autorizado crea una clase dentro de una semana del curso
- **THEN** la clase conserva tanto el curso como la semana seleccionada
- **AND** ambas relaciones pertenecen al mismo curso

#### Scenario: Clase todavía sin semana
- **WHEN** el docente crea o desasigna una clase sin elegir semana en un curso semanal
- **THEN** la clase queda disponible en la bandeja docente sin asignar
- **AND** permanece oculta para los estudiantes hasta su asignación

#### Scenario: Edición o eliminación
- **WHEN** un docente autorizado modifica o elimina una clase
- **THEN** el cambio se persiste y las vistas docentes relacionadas se revalidan

### Requirement: Orden cronológico para estudiantes
Las clases de un curso tradicional MUST mostrarse en orden cronológico ascendente, dejando las clases sin fecha al final; en un curso semanal MUST mostrarse dentro de semanas visibles ordenadas por número y en orden cronológico dentro de cada semana.

#### Scenario: Curso tradicional con varias clases
- **WHEN** el estudiante abre un curso tradicional con clases fechadas
- **THEN** ve primero la clase más antigua y luego las siguientes

#### Scenario: Curso semanal con varias semanas
- **WHEN** el estudiante abre un curso semanal con semanas publicadas
- **THEN** ve primero la semana de menor número
- **AND** dentro de ella las clases se ordenan cronológicamente dejando las que no tienen fecha al final
