## Context

Ver proposal.md. El flujo actual versiona entregas y permite correcciones solicitadas fuera de plazo. Existen tres altas (legada, archivos, URL) y tres actualizaciones; la captura GitHub es asíncrona. Las escrituras directas están cerradas y se usa cliente de servicio tras autorización.

## Goals / Non-Goals

**Goals:** política coherente en todos los puntos de entrada, compatibilidad y etiqueta independiente de evaluación.

**Non-Goals:** activar masivamente la opción, cambiar vencimientos/notas, evaluar alumnos, reabrir aprobados, push o despliegue no solicitado.

## Decisions

- assignments.allowLateSubmissions boolean opcional, false predeterminado; casilla compartida alta/edición con valores explícitos, no Boolean('false').
- deliveries.deadlineSnapshot JSON opcional {dueDate: string|null, late: boolean}, calculado con hora del servidor al persistir. Distingue entrega sin vencimiento de heredada sin snapshot; se archiva en history y normaliza defensivamente. Recalcular siempre borraría la marca al extender; backfill inventaría plazos originales.
- Releer assignment con cliente de servicio al guardar después de capturas/subidas. La misma hora decide permiso y snapshot. Mantener excepción de corrección y cierre de evaluaciones finales.
- Comparación estricta submittedAt > dueDate en instantes UTC; igualdad en término, sin vencimiento sin tardanza. No inventar etiquetas desde fechas inválidas.
- Etiqueta compartida para listado/detalle/paneles e historial. Fallback heredado según fecha actual explícito, sin reescribir datos.
- Migración aditiva idempotente conserva reglas, índices y registros. No activar ninguna opción automáticamente.

## Risks / Trade-offs

- [Desfase UI/reloj o vencimiento durante subida] → autoridad del servidor al persistir.
- [Cambios de plazo] → snapshot por versión y fallback antiguo aclarado.
- [Esquema viejo] → migración antes de usar código y verificación posterior.
- [Árbol local sucio] → preservar cambios ajenos y pruebas focalizadas; sin reset ni commit global.
- [Cambio simultáneo entre lectura/escritura] → consistencia actual de PocketBase; sin prometer transacción multirregistro.

## Migration Plan

Probar esquema/acciones/UI. Agregar campos mediante comando explícito y verificar reglas/registros. No habilitar prácticas reales automáticamente. Desplegar por flujo normal; rollback no borra campos y desactivar restaura política estricta para futuros envíos. Conservar snapshots e historial.
