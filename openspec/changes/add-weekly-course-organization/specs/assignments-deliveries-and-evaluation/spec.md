## MODIFIED Requirements

### Requirement: Gestión de trabajos prácticos
Los docentes asignados y administradores MUST poder crear, editar y eliminar trabajos prácticos con título, descripción, fecha límite, curso, una semana opcional del mismo curso, recursos y prompt de evaluación opcional.

#### Scenario: Trabajo dentro de un curso tradicional
- **WHEN** un docente crea un trabajo desde un curso tradicional
- **THEN** el trabajo se relaciona con el curso
- **AND** se incorpora a la relación de trabajos del curso

#### Scenario: Trabajo dentro de una semana
- **WHEN** un docente crea o asigna un trabajo a una semana del curso
- **THEN** el trabajo conserva el curso y la semana correspondiente
- **AND** aparece dentro de esa semana para estudiantes cuando resulte visible

#### Scenario: Trabajo todavía sin semana
- **WHEN** un trabajo de un curso semanal no posee semana
- **THEN** permanece en la bandeja docente sin asignar
- **AND** los estudiantes no pueden verlo ni crear una entrega para él

#### Scenario: Fecha límite sin hora explícita
- **WHEN** se informa solamente el día de vencimiento
- **THEN** el sistema lo interpreta como el final de ese día
