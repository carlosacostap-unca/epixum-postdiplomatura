# Publicación de clases, contenidos y trabajos prácticos

Al crear o editar una clase, un contenido independiente o un trabajo práctico se puede elegir:

- **Borrador:** solo lo ven quienes gestionan el curso y quienes tienen acceso de supervisión.
- **Publicado:** disponible para estudiantes matriculados, sujeto a la disponibilidad de su unidad.
- **Programado:** requiere fecha y hora. Se vuelve visible automáticamente al llegar ese instante.

Los formularios interpretan la hora local del dispositivo y envían el instante en UTC. Las etiquetas muestran la fecha en la zona horaria habitual de la plataforma (Argentina). La fecha de publicación es independiente de la fecha de clase o del vencimiento del trabajo práctico. Elegir una fecha pasada equivale a disponibilidad inmediata. Se puede reprogramar o cancelar volviendo a borrador; publicar manualmente también elimina la programación.

La disponibilidad se calcula en cada solicitud mediante reglas de PocketBase con `@now`, igual que las unidades programadas. No necesita un cron ni una sesión abierta. El estado persistido sigue siendo `scheduled` después de la fecha; los listados muestran **Publicado** cuando ya se alcanzó. Una página abierta muestra los cambios al actualizar o navegar.

Los recursos de clases y trabajos prácticos mantienen su propia publicación: publicar el padre no publica recursos en borrador. Los recursos de contenidos independientes siguen la publicación del contenido. Las unidades ocultas continúan ocultando clases y trabajos, incluso después de su fecha de publicación individual. La lectura por API, los enlaces directos, las descargas y la recepción de entregas respetan estos límites.

## Esquema y compatibilidad

Las colecciones `classes`, `assignments` y `course_contents` tienen `publicationStatus` opcional (`draft`, `published`, `scheduled`) y `publishAt` opcional. Un estado vacío conserva la visibilidad anterior. La aplicación crea nuevos registros explícitamente en borrador; editar sin enviar estado conserva el actual. `links` conserva sus dos estados existentes.

`npm run schema:publication` respalda el esquema y los registros, instala campos y reglas, comprueba conservación de registros e idempotencia. `node scripts/setup-resource-publication-schema.mjs --snapshot-only` crea el respaldo sin modificar PocketBase. Las migraciones de unidades, contenidos y roles conservan los campos y las reglas de publicación. Las escrituras de entregas restringidas al servicio permanecen bloqueadas.

`npm run schema:publication:verify` verifica acceso real con usuarios y registros temporales y los limpia al terminar. Para revertir, restaurar las reglas del respaldo; mantener los campos evita perder borradores y fechas. Restaurar reglas antiguas vuelve visibles clases y contenidos en borrador, por lo que la reversión debe coordinarse con la aplicación.

## Validación del 13 de octubre de 2026

- 60 pruebas de aplicación y formularios; 48 pruebas de esquema.
- TypeScript, compilación de producción y lint de los archivos modificados correctos.
- Esquema aplicado con respaldo local: 98 clases, 17 trabajos, 15 contenidos y 261 recursos conservados sin cambios. Migración idempotente.
- Verificación real: acceso antes y después de la fecha programada sin nuevas escrituras, listados, IDs, recursos, matrícula, gestores y unidades ocultas. Registros temporales eliminados.
- El lint general sigue detectando cuatro errores preexistentes en scripts auxiliares de `materials` y `tmp`, fuera de este cambio.
