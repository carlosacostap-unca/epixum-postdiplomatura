# Roles contextuales por curso

## Purpose

Definir cómo Epixum determina privilegios globales y roles de docencia o estudio por curso, preservando las relaciones existentes y evitando roles incompatibles dentro de un mismo curso.

## Requirements

### Requirement: Resolución contextual de roles
El sistema MUST considerar `admin` un privilegio global, MUST considerar docente de un curso a la persona incluida en su relación `teachers` y MUST considerar estudiante de un curso a la persona con una matrícula vigente en `course_enrollments`, sin exigir que docencia y estudio sean valores globales mutuamente excluyentes.

#### Scenario: Docencia y estudio en cursos diferentes
- **WHEN** una persona está incluida en `teachers` del curso A y posee una matrícula en el curso B
- **THEN** puede gestionar el curso A como docente
- **AND** puede acceder al curso B y participar como estudiante

#### Scenario: Docencia fuera de alcance
- **WHEN** una persona intenta gestionar un curso en cuya relación `teachers` no está incluida y no posee privilegio global de administrador
- **THEN** el sistema rechaza la operación aunque enseñe en otro curso

#### Scenario: Estudio fuera de alcance
- **WHEN** una persona intenta consumir contenido o entregar un trabajo de un curso donde no posee matrícula
- **THEN** el sistema rechaza la operación aunque sea docente de otro curso

#### Scenario: Administración global
- **WHEN** una persona con privilegio `admin` realiza una operación administrativa
- **THEN** conserva el alcance global vigente con independencia de sus participaciones en cursos

### Requirement: Exclusividad de participación dentro de un curso
El sistema MUST impedir que una misma persona sea simultáneamente docente y estudiante del mismo curso y MUST conservar sin cambios la participación existente cuando una operación produciría ese conflicto.

#### Scenario: Docente intenta matricularse en su curso
- **WHEN** una persona incluida en `teachers` intenta matricularse por clave o activar una invitación del mismo curso
- **THEN** el sistema rechaza la matrícula con un mensaje comprensible
- **AND** conserva su asignación docente

#### Scenario: Estudiante es seleccionado como docente de su curso
- **WHEN** un administrador intenta añadir a `teachers` una persona que ya posee una matrícula en ese curso
- **THEN** el sistema rechaza la asignación con un mensaje comprensible
- **AND** conserva la matrícula existente

### Requirement: Conservación de participaciones existentes
La adopción de roles contextuales MUST conservar los IDs y relaciones existentes de usuarios, cursos, docentes y matrículas, y MUST NOT eliminar ni reasignar silenciosamente participaciones para satisfacer las nuevas reglas.

#### Scenario: Datos vigentes sin conflictos
- **WHEN** la migración se aplica sobre cursos cuyas asignaciones docentes y matrículas no se superponen
- **THEN** cada curso conserva exactamente sus docentes
- **AND** cada registro de `course_enrollments` conserva su ID, estudiante, curso, fechas e invitación asociada

#### Scenario: Conflicto preexistente
- **WHEN** la auditoría detecta una persona registrada como docente y estudiante del mismo curso
- **THEN** la migración se detiene antes de modificar datos o reglas
- **AND** informa el curso y la identidad afectados para resolución administrativa explícita

#### Scenario: Ejecución repetida
- **WHEN** la auditoría y migración se ejecutan nuevamente sobre un entorno ya actualizado
- **THEN** no duplican relaciones ni alteran participaciones existentes
