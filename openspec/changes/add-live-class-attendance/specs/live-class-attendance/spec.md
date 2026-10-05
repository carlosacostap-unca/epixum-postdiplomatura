## Purpose

Permitir a docentes y administradores tomar y consultar asistencia por clase mediante ingresos en vivo y correcciones manuales trazables.

## ADDED Requirements

### Requirement: Configuración por curso interactivo
El sistema MUST permitir a administradores y docentes asignados habilitar o deshabilitar asistencia solo en cursos con clases interactivas. MUST estar inicialmente desactivada y aplicar cambios a sesiones nuevas, conservando el historial.

#### Scenario: Activar desde docencia
- **WHEN** un docente asignado habilita asistencia en su curso interactivo
- **THEN** las siguientes sesiones registran asistencia y las anteriores no cambian

#### Scenario: Denegar otro curso
- **WHEN** un docente ajeno o alumno intenta configurar asistencia o el curso no tiene interactivas
- **THEN** la operación es rechazada sin modificar datos

### Requirement: Presente exclusivamente en vivo
El sistema MUST marcar presente al alumno matriculado que ingresa durante una sesión en vivo con seguimiento. MUST NOT contar repasos ni duplicar asistencia por reingresos o distintas sesiones de la misma clase.

#### Scenario: Reingreso
- **WHEN** un alumno ingresa varias veces en vivo
- **THEN** la planilla mantiene un presente y la hora del primer ingreso

#### Scenario: Repaso
- **WHEN** un alumno consulta una sesión finalizada o una simulación
- **THEN** no se registra ni modifica asistencia

### Requirement: Planilla por clase
El sistema MUST mostrar a administradores y docentes asignados alumnos por filas y clases interactivas por columnas. Los únicos resultados de asistencia MUST ser Presente y Ausente. MUST diferir la ausencia hasta finalizar las sesiones, distinguir clases pendientes o sin seguimiento y no imputar ausencia anterior a una matrícula.

#### Scenario: Cierre de clase
- **WHEN** finalizan todas las sesiones con seguimiento de una clase
- **THEN** quienes ingresaron figuran presentes y los matriculados aplicables sin ingreso figuran ausentes

#### Scenario: Activación sin retroactividad
- **WHEN** se consulta una clase anterior cuyas sesiones no registraban asistencia
- **THEN** figura Sin registro y no se contabilizan ausentes

### Requirement: Correcciones auditadas
El sistema MUST permitir a administradores y docentes asignados corregir a Presente o Ausente en clases con seguimiento iniciado, registrando autor y fecha. MUST conservar historial y dar prioridad a la última corrección sobre ingresos automáticos.

#### Scenario: Corrección y reconexión
- **WHEN** un docente marca ausente a un alumno y este se reconecta
- **THEN** permanece ausente y se conserva autor, fecha e historial de la corrección

#### Scenario: Protección de datos
- **WHEN** un alumno o docente ajeno intenta consultar la planilla o alterar correcciones
- **THEN** se deniega acceso, incluso mediante llamadas directas a la base
