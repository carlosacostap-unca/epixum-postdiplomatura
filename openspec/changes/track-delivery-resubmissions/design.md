## Context

La entrega actual concentra contenido y evaluación en un único registro. Las actualizaciones del estudiante reemplazan `repositoryUrl`, pero no cambian `status`, `grade`, `feedback` ni `verdict`; por eso una entrega publicada continúa pareciendo evaluada después de cambiar. Los paneles docentes, a su vez, consideran pendiente solamente `status != "published"`. Véanse `proposal.md` y la especificación delta para el comportamiento requerido.

PocketBase sigue siendo la fuente de verdad, las entregas mantienen la unicidad `(assignment, student)` y las mutaciones se realizan mediante Server Actions autenticadas. La solución debe cubrir archivos y URL, conservar la compatibilidad con registros existentes y ligar las preevaluaciones de IA al commit de la versión vigente.

## Goals / Non-Goals

**Goals:**

- Representar varios intentos dentro de la única entrega existente sin perder contenido ni devoluciones publicadas.
- Derivar estados consistentes para estudiante y docente desde una única función de dominio.
- Realizar el cambio de versión y el archivado del intento anterior en una sola actualización de PocketBase.
- Impedir transiciones o adopciones de IA sobre una versión obsoleta.
- Proveer una regularización explícita y auditable para posibles reenvíos históricos.

**Non-Goals:**

- Crear mensajería o notificaciones externas.
- Reabrir entregas aprobadas o desaprobadas desde la interfaz.
- Conservar borradores docentes descartados cuando el estudiante modifica una entrega todavía abierta.
- Inferir automáticamente como reenvío un registro histórico ambiguo.

## Decisions

### Extender `deliveries` con versión e historial JSON

Se mantendrá un registro por estudiante y trabajo. Se agregarán `submissionVersion`, `evaluatedVersion`, `submittedAt`, `evaluatedAt`, `resubmissionCount` y `history`. Cada entrada de `history` guardará la versión anterior, fecha, contenido serializado y solamente su evaluación publicada, si existe.

Esta alternativa permite archivar el intento previo y activar el nuevo mediante una única actualización atómica del registro. Se descartó una colección `delivery_attempts` porque exigiría coordinar dos escrituras, migrar relaciones de IA y multiplicar consultas para un historial pequeño y acotado por entrega. Si el producto necesitara comentarios por intento o muchos artefactos, una colección separada sería la evolución natural.

### Separar el estado persistido del estado visible

`status` seguirá representando el trabajo docente del intento vigente (`pending`, `draft`, `published`). Una función pura derivará el estado visible usando además `verdict`, `submissionVersion`, `evaluatedVersion` y `resubmissionCount`:

- `pending` sin reenvíos: `Sin evaluar`.
- `pending` posterior a una corrección: `Reenviado`.
- `draft`: borrador para el docente; el estudiante continúa viendo el intento como pendiente.
- `published` con `Corregir y reenviar`: `Corrección solicitada`.
- `published` con `Aprobado`: `Evaluado · aprobado`.
- `published` con `Desaprobado`: resultado final desaprobado.

Centralizar la derivación evita que páginas, tarjetas y filtros vuelvan a interpretar `published` de maneras incompatibles.

### Consumir una excepción de reenvío por ciclo

Después del vencimiento se permitirá actualizar solamente cuando el estado vigente sea `published` y el veredicto sea `Corregir y reenviar`. La actualización crea una nueva versión y cambia el estado a `pending`, por lo que la excepción queda consumida. Antes del vencimiento, un estudiante puede seguir actualizando una entrega no final; esas actualizaciones versionan el contenido pero no se etiquetan como `Reenviado` salvo que provengan de una corrección publicada.

Se descartó dejar una ventana indefinida después del primer reenvío porque permitiría cambiar el material mientras el docente lo evalúa y volver obsoleto un borrador sin una transición explícita.

### Preservar la última devolución publicada fuera del borrador vigente

Al reenviar se copia el intento evaluado a `history` y se limpian del registro vigente `grade`, `feedback`, `verdict` y `evaluatedAt`. Así el docente puede redactar un nuevo borrador sin sobrescribir la devolución anterior, y el estudiante lee esa devolución exclusivamente desde el historial hasta que exista otra publicación.

Los borradores invalidados por una actualización anterior al vencimiento no se incorporan al historial visible. Esta decisión evita exponer contenido que el docente nunca publicó.

### Hacer las escrituras de entregas exclusivas del servidor

Las reglas de PocketBase conservarán lectura para propietario, docentes del curso y administradores, pero las altas y actualizaciones quedarán restringidas al cliente de servicio. Cada Server Action autenticará al usuario, releerá asignación y entrega desde el cliente de sesión, validará matrícula, propiedad, vencimiento y transición, y recién entonces realizará la escritura privilegiada.

Esto impide que un cliente directo falsifique contadores de versión, historial, evaluación o una reapertura. Se descartó confiar sólo en campos enviados por el navegador porque una Server Action es un endpoint no confiable y las reglas previas permitían modificar el registro del propietario.

### Asociar la evaluación y la IA a la versión vigente

Al guardar o publicar, la acción recibirá la versión que el formulario mostró y rechazará la operación si ya no coincide con `submissionVersion`. Cuando se adopte una preevaluación, además se verificará que su `commitSha` coincida con el commit GitHub del intento vigente. El formulario refrescará y pedirá una nueva revisión ante conflicto.

### Regularizar históricos mediante informe y selección explícita

La migración idempotente inicializará todas las entregas existentes como versión 1 y conservará su evaluación. Un comando separado listará candidatos GitHub cuyo origen sea `student-update`, cuyo veredicto sea `Corregir y reenviar` y cuya captura sea compatible con la última modificación. No mutará candidatos por defecto; aceptará identificadores confirmados para convertirlos a versión reenviada y trasladar la devolución existente al historial.

## Risks / Trade-offs

- [El historial JSON puede crecer] → limitar tamaño, validar su estructura y mantener un número pequeño de intentos esperado por TP.
- [Una caída entre autorización y escritura podría usar datos ya cambiados] → releer con el cliente de servicio inmediatamente antes de actualizar y validar la versión esperada; PocketBase aplica una sola escritura por transición.
- [El endurecimiento de reglas depende de credenciales de servicio] → verificar configuración antes del despliegue y ejecutar smoke tests de creación, reenvío y evaluación.
- [Las entregas históricas no contienen el contenido original reemplazado] → conservar una marca de contenido histórico no disponible y exigir confirmación manual; no inventar una captura anterior.
- [Una preevaluación anterior puede seguir apareciendo en el historial técnico] → filtrar/adoptar por commit y versión, sin borrar evidencia de auditoría.

## Migration Plan

1. Ejecutar pruebas puras del esquema y del flujo sin tocar PocketBase remoto.
2. Aplicar la migración idempotente que agrega campos, endurece reglas y backfillea metadatos conservadores.
3. Desplegar acciones y UI en la misma versión para que todas las escrituras pasen por el servidor.
4. Ejecutar el informe de candidatos sobre la cohorte 6 y revisar los identificadores con el docente.
5. Aplicar únicamente los candidatos confirmados y verificar que aparezcan como `Reenviado` en el panel docente.
6. En rollback, restaurar las reglas anteriores y mantener los campos nuevos sin borrarlos; el código previo ignorará metadatos e historial, aunque volverá a mostrar el problema original.
