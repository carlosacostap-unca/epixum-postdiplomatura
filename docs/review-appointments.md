# Revisiones por turnos

Desde **Administración → Curso → Editar**, activar **Habilitar revisiones por turnos**. La migración no activa cursos existentes. Al desactivar se conserva la agenda y el historial, pero se bloquean lectura y operaciones hasta volver a habilitar.

## Uso docente

1. Abrir el curso y la pestaña **Revisiones**. Crear una revisión con número único, título e instrucciones (por ejemplo, lugar o enlace del encuentro). Las nuevas revisiones empiezan en **Borrador**: solo las ven los docentes asignados y pueden preparar sus franjas sin mostrarlas a los alumnos. La revisión es independiente de los trabajos prácticos.
2. Agregar una franja: docente asignado al curso, fecha, inicio, fin, duración de cada turno y, opcionalmente, frecuencia y duración del descanso. Ambos campos de descanso en cero omiten los descansos.
3. Revisar **Previsualizar turnos** y confirmar **Crear turnos libres**. Al crear la franja todavía no se asignan alumnos: cada solicitud recibe el primer turno libre de esa franja. Todos los horarios se interpretan en Argentina, UTC−3, y se guardan en UTC.
4. Cualquier docente asignado al curso puede gestionar las franjas de los demás. **Editar** abre un diálogo visible con los datos de la franja. Una franja futura sin reservas pendientes puede editarse completamente o retirarse. Si tiene reservas pendientes, permite cambiar únicamente la fecha: **Previsualizar cambio de fecha** y luego **Confirmar cambio de fecha**. Conserva el docente, los horarios, los descansos y las reservas; los alumnos ven la nueva fecha en su agenda. No permite reprogramar franjas que ya comenzaron, tienen evaluaciones registradas o se superponen con otra franja del mismo docente. Los turnos reemplazados mediante la edición completa se desactivan y las cancelaciones históricas se conservan.
5. Después de finalizar un turno reservado, abrir **Evaluar turno: resultado, devolución y notas privadas** y registrar **Asistió / Ausente**, **Aprobado / No aprobado**, una **Devolución para el alumno** y, opcionalmente, **Notas privadas para docentes**. El alumno ve únicamente su resultado y devolución; las notas solo pueden leerlas los docentes asignados al curso. La evaluación guardada es definitiva. Un ausente queda no aprobado. No afecta calificaciones ni entregas de trabajos prácticos.

### Sala de reunión por franja

Al crear una franja, pegar la URL de su sala en **Enlace de la sala de reunión**. Después puede agregarse, corregirse o quitarse desde **Configurar enlace de la sala** en esa franja, incluso si ya tiene reservas o comenzó. Esto no cambia horarios, participantes ni evaluaciones. El sistema admite enlaces HTTPS de distintas plataformas; el docente proporciona una sala existente.

El alumno con un turno reservado encuentra **Unirme a la sala de reunión** en **Mis reservas y devoluciones**, junto a su horario asignado. El enlace abre en otra pestaña y corresponde a la franja de ese turno. Si aún no se cargó, se informa allí. Antes de reservar, después de cancelar y para reservas de otros alumnos, no se entrega el enlace. Los docentes asignados pueden consultar y gestionar todas las salas del curso. Los enlaces corregidos se actualizan al recargar o usar **Actualizar disponibilidad**.

### Instalación de la reprogramación

Antes de desplegar el cambio de fecha con reservas, ejecutar `npm run schema:review-rescheduling`. Respalda las reglas y actualiza únicamente los permisos de escritura de `review_blocks` y `review_slots`, sin modificar registros. La operación exige un docente asignado y una capacidad calculada en el servidor que nunca se guarda en registros ni se entrega al navegador. Usa un solo lote autenticado con control de revisión para cambiar la fecha de la franja y sus turnos activos, conservando sus identificadores, reservas y sala. Los turnos inactivos permanecen intactos. Si cambian la contraseña de servicio o la URL de PocketBase, repetir esta migración. Las instalaciones nuevas también la incluyen en `schema:reviews`.

Cerrar las reservas de una revisión impide nuevas reservas, pero conserva su visibilidad, los turnos existentes, las cancelaciones antes del inicio y las evaluaciones pendientes. La validación de superposición docente se aplica dentro de cada revisión.

### Mensaje antes de reservar

En **Editar revisión y publicación**, completar **Mensaje antes de solicitar turno** con las indicaciones para esa revisión, por ejemplo, tener el proyecto preparado o revisar requisitos antes de pedir un lugar. Es opcional, admite hasta 4000 caracteres y conserva saltos de línea. Vaciarlo desactiva el aviso.

Al elegir **Solicitar turno en esta franja**, el alumno verá las indicaciones y el rango horario en un diálogo. Recién **Confirmar solicitud** asigna el primer turno libre; **Volver sin reservar** cierra el diálogo sin guardar una reserva. Si el mensaje cambió desde que se abrió la página, el servidor rechaza la confirmación anterior y pide leer las indicaciones actualizadas. Si no hay mensaje configurado, la solicitud conserva la asignación directa. Las instrucciones generales de la revisión siguen siendo independientes de este aviso previo.

### Publicación

En **Editar revisión y publicación**, elegir **Borrador**, **Publicado** o **Programado** y guardar. Publicado permite que los alumnos matriculados accedan a la revisión; la apertura de reservas sigue siendo una opción independiente. Programado requiere una fecha y hora futura en Argentina (UTC−3) y habilita la visibilidad automáticamente al llegar ese instante, sin tareas programadas. Una programación ya cumplida se muestra como Publicado y permite editar los demás datos sin reprogramar.

Volver a Borrador o programar una fecha futura oculta la revisión, los turnos y su historial a los alumnos, incluso mediante enlaces directos o la API. Se conservan las reservas y evaluaciones; los docentes siguen pudiendo gestionarlas. Al publicarla nuevamente, cada alumno recupera acceso a su historial. Las revisiones anteriores sin estado explícito conservan su visibilidad como publicadas; la migración no modifica sus registros.

## Uso estudiantil

Los alumnos con matrícula vigente ven las franjas con su fecha, hora de inicio y hora de fin, sin nombre del docente ni selección de horarios individuales. **Solicitar turno en esta franja** asigna automáticamente el primer turno activo, futuro y libre, ordenado por inicio. El horario exacto asignado aparece en **Mis reservas y devoluciones**. No se envían al navegador los docentes de las franjas ni los horarios individuales de otros alumnos o aún sin asignar.

Cada alumno puede tener una reserva pendiente por revisión, y cada turno admite un alumno. Puede cancelar antes del inicio y solicitar nuevamente una franja. Una cancelación libera ese hueco para la siguiente solicitud, sin mover reservas existentes. Un turno vencido sigue pendiente hasta que el docente lo evalúe. Una franja completa muestra que no tiene disponibilidad y no admite solicitudes.

El servidor vuelve a comprobar la disponibilidad al confirmar. Las solicitudes simultáneas se resuelven con el control de versión y los índices únicos, reintentando la selección del primer turno libre hasta ocho veces. Nunca se confirma una reserva incierta ni se asignan dos alumnos al mismo turno. Cada docente sigue viendo la agenda completa y sus participantes.

Una evaluación no aprobada o ausente habilita un nuevo intento. La aprobación impide reservar más turnos de esa revisión. Cada revisión funciona de manera independiente y el alumno solamente accede a su historial; la disponibilidad no expone identidades ni devoluciones de otros alumnos. **Actualizar disponibilidad** permite traer cambios realizados por otros usuarios.

## Datos y consistencia

- `courses.reviewsEnabled`: activación administrativa.
- `course_reviews`: número único por curso, instrucciones, apertura de reservas, `publicationStatus` (`draft`, `published`, `scheduled`), `publishAt` (instante UTC opcional) y versión para control de concurrencia.
- `review_blocks`: configuración de franjas asignadas a docentes.
- `review_slots`: intervalos individuales, conservados aunque se retire o reemplace la franja.
- `review_bookings`: reserva e intento, asistencia y evaluación.
- `review_booking_notes`: notas privadas por reserva, separadas de los datos visibles al alumno. Solo los docentes asignados pueden leerlas, incluso mediante la API o expansiones de relaciones. Se guardan junto con la evaluación en el mismo lote atómico, con una nota por reserva y sin modificaciones posteriores. Una evaluación sin notas no crea un registro privado.
- `review_block_meetings`: sala de reunión de cada franja, en una colección separada para limitar su lectura a docentes y alumnos con reserva vigente en esa misma franja. La cancelación revoca el acceso aunque otro alumno tenga un turno en la franja.

Los índices únicos parciales impiden más de una reserva no cancelada por turno y más de un estado reservado/aprobado por alumno y revisión. Los lotes autenticados comparan la versión de la revisión y hacen que los cambios de agenda y reserva sean atómicos. Un conflicto solicita actualizar, sin confirmar una operación incierta. Las reglas de PocketBase también impiden alteraciones directas de identidades, horarios reservados, estados finales y resultados por parte de alumnos.

Una franja admite hasta 96 turnos, de 5 a 240 minutos cada uno. Se omiten intervalos finales incompletos. La edición necesita hasta 194 operaciones por lote. La migración garantiza un máximo de al menos 200 solicitudes y conserva límites superiores y demás ajustes existentes.

## Migración y verificación

Para agregar las salas de reunión o ampliar una instalación anterior que solo admitía Meet, ejecutar `npm run schema:review-meetings` antes de desplegar. Respalda el esquema y crea o actualiza `review_block_meetings` para admitir enlaces HTTPS de distintas plataformas, sin modificar turnos ni reservas existentes. Las franjas anteriores siguen sin enlace hasta que el docente lo cargue. `schema:reviews` también incluye esta colección para instalaciones nuevas.

Para agregar el aviso previo a una instalación existente, ejecutar `npm run schema:review-message` antes de desplegar. Respalda el esquema, agrega `course_reviews.bookingMessage` como texto opcional y limita su modificación a docentes asignados. Conserva el resto de las reglas, las revisiones y las reservas anteriores. `schema:reviews` también incluye este campo para instalaciones nuevas.

Para agregar notas privadas a una instalación que ya tiene revisiones, ejecutar `npm run schema:review-notes` antes de desplegar la aplicación. Este comando respalda el esquema y agrega únicamente la colección privada, sin modificar reservas ni evaluaciones anteriores. `schema:reviews` también incluye esta colección para instalaciones nuevas. Los resultados históricos siguen disponibles sin notas.

Para habilitar solicitudes por franja, ejecutar `npm run schema:review-blocks` antes del despliegue. Agrega `course_reviews.orderedBooking` y actualiza únicamente las reglas de las revisiones y de creación de reservas; no reasigna ni elimina turnos existentes. La versión nueva activa este modo al abrir una agenda estudiantil o solicitar una franja. A partir de allí, la creación de reservas exige una capacidad que solo calcula el servidor con su configuración de servicio y que nunca se guarda en registros consultables por alumnos. Si se cambia la contraseña de servicio o la URL de PocketBase, volver a ejecutar esta migración junto con el cambio de configuración. La API estudiantil no puede desactivar el modo ordenado ni confirmar horarios individuales en esas revisiones.

```powershell
npm run schema:reviews
npm run schema:reviews:test
npm run test:ui -- lib/review-appointments.test.ts lib/review-appointments-data.test.ts lib/actions-courses.test.ts components/reviews/ReviewForms.test.tsx components/reviews/ReviewAgenda.test.tsx
$env:REVIEWS_INTEGRATION='1'
npm run test:ui -- lib/review-appointments.integration.test.ts
npm run test:ui -- lib/review-rescheduling.integration.test.ts
```

La migración respalda esquema y configuración de lotes en `backups/pocketbase/review-appointments-<fecha>.json`; agrega campos y colecciones sin modificar registros existentes. Requiere las credenciales de servicio ya configuradas para PocketBase. No incluir respaldos ni credenciales en Git.

La integración utiliza cuentas y un curso temporales y limpia los registros al finalizar. Comprueba gestión compartida, matrícula, acceso entre cursos, privacidad, edición con reservas, carreras por turno y por alumno, cancelación, vencimiento, ausencia, reintento y aprobación. Para inspección en navegador, `node scripts/review-appointments-fixtures.mjs create` genera estados de sesión de cuentas temporales en `tmp/reviews/`; `advance` adelanta únicamente sus reservas para probar evaluación; `cleanup` elimina registros y credenciales temporales. Ese directorio está ignorado por Git.

Para verificar la reprogramación después de publicar, `node scripts/verify-review-rescheduling-deployment.mjs begin https://epixum.com <id-franja-a-preservar>` prepara otro curso y una reserva sintéticos, y toma una huella de solo lectura de la franja indicada. `check` verifica la página publicada, llama a la acción real con la cuenta docente temporal y comprueba que la reserva y sus turnos se conservan, la agenda estudiantil refleja la nueva fecha y la franja real permanece intacta. `cleanup` elimina los datos y credenciales del ensayo. El ensayo se guarda en `tmp/reviews/`, ignorado por Git.

## Reversión

Deshabilitar revisiones en los cursos y revertir el código de la función, conservando las colecciones y su historial. No eliminar colecciones para revertir una publicación. La configuración anterior de lotes está en el respaldo, pero debe restaurarse sólo si ninguna otra función depende de ella.
