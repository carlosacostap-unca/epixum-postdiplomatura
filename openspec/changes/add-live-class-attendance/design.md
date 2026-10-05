## Context

Ver proposal.md. Las sesiones ya tienen estado live/closed y participantes únicos por sesión/alumno, creados solo durante live con matrícula y código válido. La fecha created es servidor e inmutable. Los repasos no crean participantes.

## Goals / Non-Goals

**Goals:** reutilizar ese ingreso atómico, preservar correcciones, aislar cursos y evitar escrituras privilegiadas en cada heartbeat.

**Non-Goals:** duración mínima, tardanzas, justificaciones, invitaciones sin matrícula y notificaciones.

## Decisions

- Capturar courses.attendanceEnabled en interactive_sessions.attendanceEnabled al iniciar. La base exige coincidencia en creación e inmutabilidad posterior. Los cambios aplican a nuevas sesiones; así no se alteran presentes históricos ni se reconstruyen asistencias anteriores.
- Derivar presente desde interactive_participants.created de sesiones con seguimiento. La unicidad existente evita duplicados, sin una segunda escritura susceptible de fallar. Agrupar por clase, no por material ni sesión; basta un ingreso para presente. Ausente solo cuando todas las sesiones con seguimiento están cerradas.
- La planilla usa matrículas vigentes y conserva alumnos con ingresos o correcciones históricos. Para alumnos matriculados después del cierre se muestra No corresponde. No es un archivo histórico de bajas de matrícula sin participación.
- El esquema real no tenía fecha de creación de matrícula. Se agrega autodate para nuevas matrículas; las preexistentes sin fecha se consideran vigentes antes del seguimiento, sin inventar fechas históricas.
- Correcciones como eventos append-only en course_attendance_adjustments (curso, clase, alumno, presente/ausente, actor, fecha servidor). Última corrección prevalece sobre todo ingreso automático; no se pierden por reconectar. Lecturas/escrituras API bloqueadas, acciones servidor autorizan administrador o docente asignado antes de usar servicio.
- La pestaña Asistencia se ofrece para cursos interactivos incluso antes de habilitarla, con interruptor y planilla. Sesiones anteriores sin seguimiento figuran Sin registro; futuras Pendiente. Son indicaciones de disponibilidad, no estados de asistencia adicionales.

## Risks / Trade-offs

- Desactivar clases interactivas → se bloquean nuevas operaciones de asistencia y se conservan registros; reactivar recupera la planilla.
- Cambios de matrícula → no marcar ausentes retroactivos si la matrícula actual es posterior al cierre; conservar participantes aunque se retiren del padrón.
- Varias sesiones de la misma clase → consolidar el primer ingreso, y diferir ausencia mientras alguna permanezca abierta.
- Errores de infraestructura → mostrar error recuperable, no ocultarlo como planilla vacía.

## Migration Plan

Respaldar esquema e inventario. Agregar flags con valor inicial false y colección privada; actualizar reglas de sesiones conservando campos/índices. No habilitar cursos automáticamente. Desplegar aplicación tras migrar. Rollback: deshabilitar asistencia para sesiones nuevas; conservar datos.
