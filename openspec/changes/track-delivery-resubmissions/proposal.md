## Why

Cuando un estudiante actualiza una entrega después de recibir el veredicto `Corregir y reenviar`, el registro conserva hoy el estado `published`: el alumno sigue viéndolo como evaluado y el docente no lo recibe nuevamente en su cola de revisión. El curso necesita distinguir cada reenvío, conservar la devolución previa y repetir el ciclo de corrección hasta la aprobación.

## What Changes

- Permitir reenvíos únicamente después de una evaluación publicada con veredicto `Corregir y reenviar`, incluso si venció la fecha límite original.
- Registrar cada envío o reenvío como un intento versionado, sin perder la entrega ni la evaluación anterior.
- Mostrar al estudiante el estado `Reenviado · pendiente de revisión` junto con la devolución anterior mientras espera una nueva corrección.
- Incorporar los reenvíos a los contadores, listados y filtros de trabajo pendiente del docente.
- Cerrar nuevas modificaciones cuando el último veredicto publicado sea `Aprobado` o `Desaprobado`.
- Permitir ciclos repetidos de corrección, reenvío y evaluación hasta alcanzar un resultado final.
- Incorporar una migración y un informe de candidatos para regularizar con seguridad entregas existentes, sin clasificar automáticamente casos ambiguos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `assignments-deliveries-and-evaluation`: amplía el ciclo de entrega y evaluación con intentos versionados, reenvíos posteriores al vencimiento, historial visible y estados docentes/estudiantiles coherentes.

## Impact

- Persistencia PocketBase: nueva colección o estructura equivalente para intentos de entrega, campos de relación y reglas de acceso; migración compatible con entregas existentes.
- Acciones de servidor: creación, actualización/reenvío, publicación de evaluaciones y validación de permisos y transiciones.
- Interfaces estudiantil y docente: estados, historial, habilitación de reenvío, filtros, contadores y paneles de pendientes.
- Preevaluación con IA: cada ejecución debe corresponder al intento vigente para evitar adoptar resultados de una versión anterior.
- Pruebas de esquema, acciones, derivación de estados, paneles y componentes.
