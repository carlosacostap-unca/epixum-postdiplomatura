## Purpose

Permitir que cada curso organice revisiones individuales con agenda docente, reserva voluntaria e historial de intentos hasta que cada alumno apruebe.

## ADDED Requirements

### Requirement: Activación y alcance de las revisiones
El sistema MUST permitir al administrador habilitar revisiones opcionalmente por curso. Las revisiones MUST tener un número único positivo por curso, título e instrucciones, y ser independientes de los trabajos prácticos. Los cursos existentes MUST conservar la función deshabilitada. Solamente docentes asignados MUST gestionar revisiones y franjas del curso.

#### Scenario: Curso sin revisiones
- **WHEN** la función está deshabilitada
- **THEN** no se ofrece navegación ni se permite acceder o reservar mediante una solicitud directa.

#### Scenario: Docentes del mismo curso
- **WHEN** un docente asignado crea una franja para otro docente del curso
- **THEN** se permite gestionarla y se rechaza asignarla a alguien ajeno al curso.

### Requirement: Franjas y descansos
El sistema MUST permitir crear y previsualizar turnos libres a partir de fecha, inicio, fin, duración, frecuencia de descansos y duración del descanso. MUST mostrar la zona horaria y MUST NOT asignar alumnos automáticamente ni generar turnos fuera del rango. MUST rechazar superposiciones del mismo docente dentro de la revisión y cambios de horario con reservas pendientes.

#### Scenario: Descansos intercalados
- **WHEN** se confirma una franja de 18 a 19 con turnos de 15 minutos y descanso de 10 minutos cada dos turnos
- **THEN** se crean turnos 18:00–18:15, 18:15–18:30 y 18:40–18:55, sin uno parcial al final.

### Requirement: Reservas y cancelación
Solamente alumnos con matrícula vigente MUST reservar un turno futuro libre en una revisión abierta. Cada turno MUST admitir un alumno y cada alumno MUST tener como máximo una reserva pendiente por revisión. MUST permitir cancelar únicamente antes del inicio, liberar el turno y conservar el historial. Estas garantías MUST mantenerse ante concurrencia.

#### Scenario: Competencia por el mismo turno
- **WHEN** dos alumnos intentan reservar el mismo turno a la vez
- **THEN** solamente una reserva se confirma y el otro alumno recibe una indicación para actualizar su elección.

#### Scenario: Cancelación y elección nueva
- **WHEN** el alumno cancela antes del inicio
- **THEN** conserva el historial cancelado y puede elegir otro turno de esa revisión.

### Requirement: Evaluación e intentos hasta aprobar
Los docentes del curso MUST registrar después de finalizar el turno asistencia, resultado y devolución. Un ausente MUST quedar no aprobado. Un resultado no aprobado MUST habilitar otra reserva de la misma revisión. Una aprobación MUST impedir nuevas reservas de esa revisión. Un turno sin evaluar MUST seguir pendiente. El historial MUST conservar intentos y devoluciones y el alumno MUST ver únicamente el propio.

#### Scenario: Reintento tras no aprobar
- **WHEN** el docente guarda asistió, todavía no aprobó y una devolución
- **THEN** el alumno ve el resultado anterior y puede reservar otro turno disponible sin borrar el intento.

#### Scenario: Aprobación y privacidad
- **WHEN** se registra aprobado
- **THEN** se muestra la revisión aprobada, se impiden nuevas reservas y otros alumnos no pueden leer esa evaluación.
