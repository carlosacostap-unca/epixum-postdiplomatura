## Context

Los recursos comparten la colección `links`, con un único padre clase, trabajo práctico o contenido independiente. Las reglas de lectura comprueban matrícula y disponibilidad semanal; las acciones autorizan por el curso del padre. Los bedeles asignados cuentan con una vista de supervisión protegida que usa un cliente de servicio.

## Goals / Non-Goals

**Goals:** aplicar la publicación individual en el límite de datos y en la generación de descargas; conservar permisos y recursos actuales.

**Non-Goals:** modificar publicación de clases o contenidos independientes, revocar archivos ya descargados o enlaces externos.

## Decisions

- Campo opcional `publicationStatus` en `links` y `assignments` con valores `draft` y `published`. Vacío equivale a publicado para compatibilidad sin reescribir recursos existentes. Las altas de clase/TP desde la aplicación usan borrador por defecto.
- Un selector reutilizable en formularios y una etiqueta en listados docentes. Las ediciones sin estado explícito conservan el estado actual.
- Las reglas `links` combinan publicación con los permisos de matrícula y semana, y las acciones rechazan descargas de borradores para estudiantes. Filtrar solo en React no protegería la API ni URLs serializadas.
- Los gestores mantienen acceso completo y los bedeles asignados conservan supervisión de solo lectura. Los recursos de contenido independiente no incorporan selector ni restricción nueva.
- Invalidar las rutas del padre real, obtenido del servidor, después de mutaciones.

## Risks / Trade-offs

- Reaplicar migraciones de reglas podría quitar el filtro → compartir las reglas y garantizar el campo cuando dichas migraciones actualizan `links`.
- URLs S3 ya emitidas siguen vigentes hasta su expiración (actualmente una hora) → impedir nuevas firmas al volver a borrador; no prometer revocación retroactiva.
- Estado vacío visible por compatibilidad → la aplicación crea nuevos recursos explícitamente como borrador y las pruebas incluyen registros anteriores.

## Migration Plan

Respaldar esquema y recursos en la carpeta ignorada de respaldos, agregar campo y reglas de forma idempotente, verificar lectura real con cuentas temporales y luego desplegar la aplicación. No modificar filas existentes. Para revertir, restaurar reglas previas solo si se acepta que los borradores vuelvan a estar visibles; mantener el campo conserva sus estados.

El alcance confirmado incluye trabajos prácticos completos. Sus reglas de lectura exigen publicación y las acciones de entrega comprueban el estado antes de usar el cliente de servicio. Las reglas directas de entregas permanecen bloqueadas si ya estaban restringidas al servicio. Un TP nuevo inicia en borrador; publicar el TP no cambia el estado de sus recursos.
