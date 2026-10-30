## Context

La disponibilidad depende del cliente, el servicio de revisiones y dos reglas de PocketBase: actualización de reservas y creación de notas privadas. Cambiar únicamente la reserva dejaría fallando el lote cuando incluye notas. Ver la motivación en proposal.md.

## Goals / Non-Goals

**Goals:** aceptar el instante de inicio inclusivo en las tres capas, manteniendo el guardado atómico de evaluación y notas.

**Non-Goals:** borradores, reapertura de evaluaciones, cambios de horario, cambios en entregas de TP o publicación de notas privadas.

## Decisions

- Sustituir la comparación con endsAt por startsAt en la habilitación y el servicio. El servidor sigue siendo la autoridad temporal; el contador del cliente se actualiza con su intervalo existente.
- Actualizar también booking.slot.startsAt en la regla de creación de notas, conservando sus demás restricciones.
- Incorporar una migración incremental que reemplaza exclusivamente las dos cláusulas conocidas y conserva reglas adicionales. Validar ambas reglas antes de escribir; rechazar reglas inesperadas. Evitar reaplicar la migración general, que podría incluir cambios ajenos.
- No modificar el cambio OpenSpec activo original de revisiones: este ajuste documenta la nueva regla temporal y la referencia anterior se conserva como antecedente.

## Risks / Trade-offs

- Una regla sin migrar rechaza el guardado → aplicar la migración antes de desplegar y probar el lote con notas privadas durante un turno sintético.
- Una evaluación anticipada dentro del turno sigue siendo definitiva → conservar el texto del botón y la explicación de la interfaz.
- Cambios locales ajenos → aislar archivos del ajuste y no incluirlos en una eventual publicación.

## Migration Plan

Respaldar las dos colecciones y aplicar solo sus cláusulas temporales. Verificar con usuarios, curso y reservas sintéticos, que se eliminan al terminar. La aplicación anterior es compatible con la regla nueva. Para revertir, recuperar la versión anterior del código y las dos reglas respaldadas, sin borrar reservas ni evaluaciones.
