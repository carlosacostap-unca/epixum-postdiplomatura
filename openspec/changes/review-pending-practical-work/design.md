## Context

El detalle de entrega ya permite a docentes revisar informes de IA y adoptar sus resultados. PocketBase conserva intentos y configuraciones por trabajo.

## Goals / Non-Goals

Detectar las entregas pendientes de todos los cursos y generar informes automáticamente con el servidor Node activo. Cada trabajo conserva la revisión docente como modo predeterminado. El responsable puede activar la publicación automática.

## Decisions

- Consultar entregas por estado con la sesión administrativa y paginar en PocketBase para acotar cada lectura.
- Recorrer pendientes por ID en lotes de 25 cada minuto, con un único recorrido simultáneo por instancia. Volver al principio al acabar el listado para detectar pendientes anteriores y cambios de rúbrica.
- Reutilizar el servicio de IA y su control de concurrencia. Para el proceso interno, comprobar el estado, el curso y la rúbrica con la identidad de servicio. Los intentos manuales conservan su solicitante. Los automáticos dejan la relación vacía. Reutilizar informes existentes y espaciar los reintentos tras fallos.

## Risks / Trade-offs

Una entrega puede publicarse mientras la lista está abierta. El servidor vuelve a leerla antes del análisis. El proceso consulta los intentos persistidos antes de enviar material al proveedor. Los fallos individuales permiten continuar con el resto del lote.

## Migration Plan

Antes de iniciar la nueva versión del servidor, ejecutar `npm run schema:ai-preevaluation` contra el PocketBase del entorno para permitir intentos sin solicitante en `ai_preevaluations.requestedBy`. El proceso utiliza las credenciales de servicio y la clave de OpenAI ya configuradas para la preevaluación docente.

La publicación verifica evidencia y usa una transacción en PocketBase para comprobar el estado actual de la entrega, el curso, el intento y la configuración. La misma transacción guarda la evaluación y su adopción. Desplegar el hook de publicación en el directorio pb_hooks del servidor PocketBase y aplicar el esquema de IA antes de habilitar el modo.
