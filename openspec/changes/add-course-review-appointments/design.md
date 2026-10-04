## Context

La aplicación usa acciones de servidor con sesiones de PocketBase y reglas de colección; el patrón de sesiones interactivas ya utiliza lotes transaccionales y versiones comparadas en reglas. Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals:** reservas consistentes entre pestañas y procesos, historial privado por alumno y horarios inequívocos.

**Non-Goals:** asignación automática de alumnos, vinculación a trabajos prácticos, correos, calendarios externos y turnos grupales.

## Decisions

- Cuatro colecciones: revisiones, franjas, turnos y reservas. Las franjas guardan configuración; los turnos son intervalos materializados. Se conserva la reserva cancelada como historial.
- Escrituras con cliente autenticado y reglas de PocketBase. Índices únicos parciales impiden dos reservas no canceladas para un turno y dos estados pendiente/aprobado por alumno y revisión. La aprobación conserva ese bloqueo; la evaluación no aprobada lo libera.
- Lotes transaccionales con comparación de versión de la revisión para cambios de agenda y reservas: un conflicto exige recargar. Las reglas verifican adicionalmente propiedad, matrícula, estado y tiempo incluso ante solicitudes directas.
- Edición de franjas futuras sin reservas pendientes: desactivar turnos anteriores y generar reemplazos en un solo lote; no eliminar historial. Se valida superposición docente dentro de la revisión.
- Fecha y hora de Argentina, explícitas en pantalla; almacenamiento UTC. No se generan turnos parciales ni descansos finales innecesarios. Vista previa antes de confirmar.
- Evaluación al finalizar el turno, estados asistió/ausente y aprobado/todavía no aprobó. Ausente implica no aprobado. El turno vencido sin evaluación sigue pendiente; una evaluación no aprobada permite reintentar. Resultado guardado definitivo para preservar coherencia del historial y las nuevas reservas.
- Activación administrativa opcional; docentes asignados gestionan. Los estudiantes solamente leen su historial, disponibilidad y nombres de docentes, nunca datos de otros alumnos.

## Risks / Trade-offs

- [Dos alumnos reservan a la vez] → unicidad en base de datos y transacción; mensaje de conflicto y actualización de pantalla.
- [Cambios de horario con reservas] → se rechazan cambios de franjas con reservas pendientes y se conservan turnos históricos.
- [Agenda pendiente de evaluación] → se explica el bloqueo en la pantalla y se ofrece evaluación docente.
- [Lotes deshabilitados o límite bajo] → migración configura un límite acotado suficiente y verificación real de transacciones.

## Migration Plan

Respaldo de esquema; migración aditiva e idempotente con función deshabilitada por defecto; pruebas de reglas y concurrencia con datos temporales. Para revertir, deshabilitar la función conservando las colecciones e historial y restaurar código anterior. No borrar datos de revisión.
