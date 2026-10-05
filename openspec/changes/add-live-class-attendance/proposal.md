## Why

Los cursos con clases interactivas necesitan registrar asistencia al ingreso en vivo y ofrecer una planilla consultable por docentes y administración, sin contar los repasos.

## What Changes

- Opción de asistencia por curso interactivo, administrada por docentes asignados y administradores, desactivada inicialmente.
- Registro automático al ingresar a sesiones en vivo; una celda por alumno y clase, incluso con reingresos o varias sesiones de la misma clase.
- Planilla con presentes y ausentes, hora del primer ingreso y correcciones manuales auditadas.
- Clases futuras pendientes y clases anteriores sin seguimiento sin ausencias retroactivas.

## Capabilities

### New Capabilities
- `live-class-attendance`: configuración, registro automático en vivo, planilla y correcciones auditadas por curso/clase.

### Modified Capabilities
Ninguna.

## Impact

Next.js: navegación docente/administrativa, páginas y acciones de asistencia. PocketBase: opción del curso, captura inmutable de la opción al iniciar sesión y colección privada de correcciones. Se reutilizan participantes y sus fechas servidor. Migración aditiva con respaldo; sesiones existentes quedan sin seguimiento y no se modifica el padrón.
