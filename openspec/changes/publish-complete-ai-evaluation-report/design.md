## Context

La propuesta describe la motivación. `ai_preevaluations.result` ya guarda resultados por criterio y listas; `coverage` registra archivos y `configSnapshot` la rúbrica histórica. La vista estudiantil muestra `deliveries.feedback` completo y el historial conserva ese campo. Los intentos de IA sólo son accesibles a administradores y docentes asignados.

## Goals / Non-Goals

**Goals:** formar texto legible y editable desde campos explícitos, sin una llamada adicional al proveedor, que se conserve al publicar y reenviar.

**Non-Goals:** cambiar notas, reevaluar/republicar entregas antiguas, enviar correos, publicar diagnósticos administrativos o obtener razonamiento interno de la IA. No modificar prompts docentes existentes ni inferir puntajes por criterio que no fueron devueltos.

## Decisions

1. Usar un formateador puro compartido con una selección explícita de campos pedagógicos. No serializar el intento completo; así no se publican IDs administrativos, uso, claves ni instrucciones del servidor.
2. Guardar el informe como texto en `deliveries.feedback`, conservando el contrato de publicación y el historial. Una columna JSON nueva exigiría migración, nuevas reglas y sincronización innecesarias para este alcance.
3. El DTO docente incorpora sólo la rúbrica del snapshot (criterios) necesaria para descripción y peso; no la configuración vigente, que puede haber cambiado. El texto se compone al obtener una nueva sugerencia o cuando no existe devolución guardada. No se sustituye texto publicado/guardado al abrir la página.
4. Cada criterio conserva observación y estado traducido. La nota/veredicto oficiales siguen siendo los campos editables existentes; el mensaje propuesto se conserva como resumen editable, sin inventar descomposición de la nota. Aprobados reciben recomendaciones no vinculantes según las instrucciones ya existentes.
5. Se lista cobertura completa disponible y se distingue omisión de inexistencia. Sin cobertura o snapshot histórico se indica que ese detalle no está disponible; no se fabrica.

## Risks / Trade-offs

- Texto largo → conservar saltos de línea y todos los elementos, probar contenido más largo que el mensaje resumido y no truncar listas.
- Mensaje/informe inconsistentes después de edición → todo el texto es editable; confirmación aclara que se publica el informe completo y el docente debe revisar coherencia con nota/veredicto.
- Notas antiguas sin detalle → se preservan; sólo una nueva solicitud explícita reemplaza la propuesta, nunca una migración.
- Observaciones equivocadas del proveedor → son propuestas revisables, con advertencias de cobertura y sin alegar ejecución.

## Migration Plan

Desplegar código sin cambios de esquema ni permisos. Para revertir, retirar la composición predeterminada; los textos completos ya publicados permanecen legibles por el contrato existente. No modificar datos de producción durante la implementación.
