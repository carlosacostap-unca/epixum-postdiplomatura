## Purpose

Definir la estructura, administración, publicación y visibilidad de semanas que organizan el contenido pedagógico de los cursos configurados con modalidad semanal.

## ADDED Requirements

### Requirement: Gestión docente de semanas
Solamente un docente asignado al curso MUST poder crear, editar, ordenar y eliminar sus semanas cuando el curso utiliza modalidad `semanal`; un docente no asignado MUST NOT modificar esa estructura.

#### Scenario: Docente asignado crea una semana
- **WHEN** un docente asignado guarda datos válidos en un curso semanal
- **THEN** se crea una semana relacionada con ese curso
- **AND** la vista docente refleja inmediatamente la nueva estructura

#### Scenario: Curso tradicional
- **WHEN** un docente intenta crear una semana en un curso de modalidad `tradicional`
- **THEN** el servidor rechaza la operación sin crear registros

#### Scenario: Docente ajeno
- **WHEN** un docente no asignado intenta modificar una semana por una llamada directa
- **THEN** el servidor y las reglas de datos rechazan la operación

### Requirement: Identidad y orden de las semanas
Cada semana MUST tener un número entero no negativo —incluido `0`— y un título obligatorios, MUST mantener un número único dentro de su curso y MAY tener fechas opcionales de inicio y finalización.

#### Scenario: Datos válidos
- **WHEN** el docente guarda un número no utilizado, un título y fechas coherentes
- **THEN** la semana se muestra ordenada por su número dentro del curso

#### Scenario: Número repetido
- **WHEN** se intenta guardar para un curso un número de semana ya existente
- **THEN** el sistema rechaza el duplicado y conserva los datos ingresados para corregirlos

#### Scenario: Fechas opcionales
- **WHEN** el docente omite ambas fechas
- **THEN** puede guardar la semana sin que el sistema invente un calendario

#### Scenario: Rango inválido
- **WHEN** la fecha final es anterior a la fecha inicial
- **THEN** el sistema rechaza el rango y señala los campos correspondientes

### Requirement: Estados y publicación de semanas
Cada semana MUST tener estado `borrador`, `publicada` o `programada`; una semana programada MUST requerir fecha y hora de publicación y MUST hacerse visible automáticamente al alcanzarlas.

#### Scenario: Semana borrador
- **WHEN** una semana permanece en `borrador`
- **THEN** los docentes asignados pueden gestionarla
- **AND** los estudiantes no ven la semana ni su contenido

#### Scenario: Publicación inmediata
- **WHEN** el docente cambia una semana a `publicada`
- **THEN** los estudiantes matriculados pueden verla junto con su contenido asignado

#### Scenario: Publicación futura
- **WHEN** una semana `programada` todavía no alcanzó su fecha y hora de publicación
- **THEN** permanece oculta para los estudiantes

#### Scenario: Programación cumplida
- **WHEN** la hora actual alcanza o supera la publicación programada
- **THEN** la semana y su contenido se vuelven visibles automáticamente para los estudiantes matriculados

### Requirement: Contenido semanal y bandeja sin asignar
Los docentes asignados MUST poder asociar, mover o quitar la semana de clases, trabajos prácticos y consultas del mismo curso; el contenido sin semana MUST permanecer disponible en una bandeja docente y MUST permanecer oculto para estudiantes mientras el curso sea semanal.

#### Scenario: Asignación válida
- **WHEN** el docente asigna contenido a una semana del mismo curso
- **THEN** el contenido aparece dentro de esa semana y deja la bandeja sin asignar

#### Scenario: Movimiento entre semanas
- **WHEN** el docente mueve contenido a otra semana del mismo curso
- **THEN** se conserva el contenido y solamente cambia su agrupación semanal

#### Scenario: Contenido sin asignar
- **WHEN** una clase, trabajo o consulta no tiene semana en un curso semanal
- **THEN** el docente lo encuentra en la bandeja sin asignar
- **AND** el estudiante no lo ve en el recorrido del curso

#### Scenario: Semana de otro curso
- **WHEN** se intenta relacionar contenido con una semana perteneciente a otro curso
- **THEN** el servidor rechaza la operación y conserva la relación anterior
