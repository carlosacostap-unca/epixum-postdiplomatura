## Why

Los cursos necesitan organizar revisiones individuales mediante turnos elegidos por los alumnos y conservar los intentos hasta la aprobación. Hoy no existe una agenda ni un registro de asistencia y resultado por instancia de revisión.

## What Changes

- Activación opcional de revisiones por curso desde administración.
- Revisiones numeradas e independientes de los trabajos prácticos.
- Franjas asignadas a docentes, con fecha, inicio, fin, duración de turno y descansos cada cierta cantidad de turnos; vista previa y creación explícita de disponibilidad, sin asignaciones de alumnos.
- Todos los docentes asignados pueden gestionar las revisiones y franjas del curso.
- Los alumnos matriculados reservan o cancelan antes del inicio; una reserva pendiente por alumno y revisión.
- Asistencia, aprobación y devolución docente después del turno; nuevos intentos para ausentes o no aprobados, conservando historial.

## Capabilities

### New Capabilities
- `course-review-appointments`: Agenda, reservas y seguimiento de revisiones opcionales por curso.

### Modified Capabilities
Ninguna.

## Impact

Tipos, configuración administrativa, navegación docente/estudiantil, páginas y acciones de revisiones; nuevas colecciones y reglas de PocketBase con migración idempotente. Los cursos existentes mantienen la función deshabilitada. No se modifican entregas ni calificaciones de trabajos prácticos.
