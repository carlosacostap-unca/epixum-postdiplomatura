# Entregas fuera de término

## Uso

La configuración es por trabajo práctico y está disponible en todos los cursos. No se habilita automáticamente en trabajos existentes ni nuevos.

- **Docente asignado:** crear o editar el TP y marcar **Permitir entregas fuera de término**.
- **Administrador:** abrir la edición del curso, ir a **Plazos de los trabajos prácticos**, marcar la casilla del práctico correspondiente y pulsar **Guardar política**.
- **Desactivada:** se bloquea la primera entrega o actualización después de la fecha y hora límite. Se mantiene la excepción existente de un reenvío pedido mediante `Corregir y reenviar`.
- **Activada:** se aceptan archivos y enlaces después del vencimiento, sin cambiarlo. El alumno ve una advertencia; el docente ve **Fuera de término** en listado, detalle y paneles de pendientes. La etiqueta es informativa: no altera nota, veredicto ni rúbrica.
- Las evaluaciones finales `Aprobado` o `Desaprobado` siguen cerradas; activar la casilla no las reabre.

La hora exacta de vencimiento todavía está en término; se marca tardía sólo si la hora de registro del servidor es posterior. Sin vencimiento no hay tardanza.

## Persistencia e historial

`assignments.allowLateSubmissions` es booleano opcional, inicialmente false. `deliveries.deadlineSnapshot` conserva `{ dueDate: string | null, late: boolean }` con el plazo vigente y hora del servidor al guardar la versión. No se aceptan estos metadatos desde el formulario estudiantil. Se relee la política al persistir, incluso después de capturar GitHub o terminar una subida; si el plazo se cerró se rechaza el registro.

El snapshot se archiva en `history` al cambiar de versión. Extender luego el vencimiento no modifica la condición ya registrada de esa versión. La nueva versión usa el nuevo plazo. Se preservan evaluación y contenido anteriores según el flujo normal de reenvíos.

Los registros anteriores no se reescriben: si no tienen snapshot se compara `submittedAt` (o `created`) con el vencimiento actual. La etiqueta aclara en su descripción que es una comparación con el plazo actual y no una reconstrucción del plazo original. No se puede conocer retrospectivamente si hubo prórrogas anteriores.

## Esquema y despliegue

Antes de desplegar el código en otra instancia:

```powershell
npm run schema:late-submissions:test
npm run schema:late-submissions
```

El comando requiere las credenciales privadas habituales de PocketBase en `.env.local`. La migración agrega sólo los campos faltantes, conserva reglas, índices y campos existentes, y no escribe prácticos ni entregas. Un campo incompatible aborta la operación antes de escribir. Requiere que las escrituras directas de `deliveries` ya estén cerradas; si no, seguir primero [la activación del flujo de reenvíos](./delivery-resubmissions.md).

El código debe desplegarse por el procedimiento normal; cambiar el esquema no publica la interfaz por sí solo. No se habilitan trabajos reales como parte de la migración.

Para rollback, volver al código anterior y dejar los campos nuevos: no borrarlos ni borrar historial. Desactivar la casilla restaura el cierre estricto para futuros envíos no finales, sin eliminar entregas tardías ya recibidas.

## Validación del 15 de octubre de 2026

- Migración real aplicada y verificada como idempotente: 18 trabajos y 603 entregas conservaron sus datos completos, cotejados por hash sin los campos nuevos. Reglas, índices y campos anteriores también idénticos; ninguna habilitación automática. Snapshot de esquema previo guardado en `tmp/late-submissions-migration/schema-before-1792074749628.json` (local, ignorado).
- Pruebas de límites temporales/zonas horarias, sin plazo, casilla false/on, snapshots e historial, las seis mutaciones de entregas, pertenencia/propiedad, corrección fuera de plazo, cierre de aprobados y cambio de política o vencimiento durante la captura. Pruebas UI de alta/edición, administración, archivos/URL, etiqueta e historial y habilitación luego de refrescar datos.
- Cuatro pruebas nuevas del esquema: conservación, idempotencia, incompatibilidades y bloqueo previo de escrituras directas. Integradas en `npm run schema:test`.
- Resultado final de la suite: 551 pruebas aprobadas y 8 omitidas; esquema: 52 aprobadas. No se ejecutaron pruebas de proveedores externos sobre datos reales de alumnos.
- Compilación de producción y TypeScript aprobados. ESLint focalizado sobre todos los archivos del cambio sin errores ni advertencias.
- El lint general del árbol local no está limpio por cinco errores previos en materiales privados y scripts temporales (`react/no-children-prop` y `@next/next/no-assign-module-variable`), más advertencias ajenas al cambio. No se modificaron esos archivos para ocultarlos.
- No se hizo commit, push, despliegue ni evaluación/publicación de trabajos de alumnos en esta operación. Los cambios locales ajenos, incluidos los de preparación/exámenes, se conservaron.
