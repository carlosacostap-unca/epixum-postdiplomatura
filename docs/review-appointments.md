# Revisiones por turnos

Desde **Administración → Curso → Editar**, activar **Habilitar revisiones por turnos**. La migración no activa cursos existentes. Al desactivar se conserva la agenda y el historial, pero se bloquean lectura y operaciones hasta volver a habilitar.

## Uso docente

1. Abrir el curso y la pestaña **Revisiones**. Crear una revisión con número único, título e instrucciones (por ejemplo, lugar o enlace del encuentro). La revisión es independiente de los trabajos prácticos.
2. Agregar una franja: docente asignado al curso, fecha, inicio, fin, duración de cada turno y, opcionalmente, frecuencia y duración del descanso. Ambos campos de descanso en cero omiten los descansos.
3. Revisar **Previsualizar turnos** y confirmar **Crear turnos libres**. Nunca se asignan alumnos automáticamente. Todos los horarios se interpretan en Argentina, UTC−3, y se guardan en UTC.
4. Cualquier docente asignado al curso puede gestionar las franjas de los demás. Una franja futura puede editarse o retirarse mientras no tenga reservas pendientes. Los turnos reemplazados se desactivan y las cancelaciones históricas se conservan.
5. Después de finalizar un turno reservado, registrar **Asistió / Ausente**, **Aprobó / Todavía no aprobó** y una devolución. La evaluación guardada es definitiva. Un ausente queda no aprobado. No afecta calificaciones ni entregas de trabajos prácticos.

Cerrar las reservas de una revisión impide nuevas reservas, pero conserva su visibilidad, los turnos existentes, las cancelaciones antes del inicio y las evaluaciones pendientes. La validación de superposición docente se aplica dentro de cada revisión.

## Uso estudiantil

Los alumnos con matrícula vigente ven la disponibilidad y reservan un turno libre. Cada alumno puede tener una reserva pendiente por revisión, y cada turno admite un alumno. Puede cancelar antes del inicio y elegir otro turno. Un turno vencido sigue pendiente hasta que el docente lo evalúe.

Una evaluación no aprobada o ausente habilita un nuevo intento. La aprobación impide reservar más turnos de esa revisión. Cada revisión funciona de manera independiente y el alumno solamente accede a su historial; la disponibilidad no expone identidades ni devoluciones de otros alumnos. **Actualizar disponibilidad** permite traer cambios realizados por otros usuarios.

## Datos y consistencia

- `courses.reviewsEnabled`: activación administrativa.
- `course_reviews`: número único por curso, instrucciones, apertura de reservas y versión para control de concurrencia.
- `review_blocks`: configuración de franjas asignadas a docentes.
- `review_slots`: intervalos individuales, conservados aunque se retire o reemplace la franja.
- `review_bookings`: reserva e intento, asistencia y evaluación.

Los índices únicos parciales impiden más de una reserva no cancelada por turno y más de un estado reservado/aprobado por alumno y revisión. Los lotes autenticados comparan la versión de la revisión y hacen que los cambios de agenda y reserva sean atómicos. Un conflicto solicita actualizar, sin confirmar una operación incierta. Las reglas de PocketBase también impiden alteraciones directas de identidades, horarios reservados, estados finales y resultados por parte de alumnos.

Una franja admite hasta 96 turnos, de 5 a 240 minutos cada uno. Se omiten intervalos finales incompletos. La edición necesita hasta 194 operaciones por lote. La migración garantiza un máximo de al menos 200 solicitudes y conserva límites superiores y demás ajustes existentes.

## Migración y verificación

```powershell
npm run schema:reviews
npm run schema:reviews:test
npm run test:ui -- lib/review-appointments.test.ts lib/actions-courses.test.ts components/reviews/ReviewForms.test.tsx
$env:REVIEWS_INTEGRATION='1'
npm run test:ui -- lib/review-appointments.integration.test.ts
```

La migración respalda esquema y configuración de lotes en `backups/pocketbase/review-appointments-<fecha>.json`; agrega campos y colecciones sin modificar registros existentes. Requiere las credenciales de servicio ya configuradas para PocketBase. No incluir respaldos ni credenciales en Git.

La integración utiliza cuentas y un curso temporales y limpia los registros al finalizar. Comprueba gestión compartida, matrícula, acceso entre cursos, privacidad, edición con reservas, carreras por turno y por alumno, cancelación, vencimiento, ausencia, reintento y aprobación. Para inspección en navegador, `node scripts/review-appointments-fixtures.mjs create` genera estados de sesión de cuentas temporales en `tmp/reviews/`; `advance` adelanta únicamente sus reservas para probar evaluación; `cleanup` elimina registros y credenciales temporales. Ese directorio está ignorado por Git.

## Reversión

Deshabilitar revisiones en los cursos y revertir el código de la función, conservando las colecciones y su historial. No eliminar colecciones para revertir una publicación. La configuración anterior de lotes está en el respaldo, pero debe restaurarse sólo si ninguna otra función depende de ella.
