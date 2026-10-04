# Preparación de evaluaciones

Sección opcional por curso para practicar preguntas de opción múltiple. Preferencias confirmadas: una respuesta correcta, intentos ilimitados, resultado con respuestas correctas y explicación al terminar. El docente consulta intentos, resultados y respuestas; no se modifican las notas de trabajos prácticos.

## Uso

1. Administración → editar curso → **Habilitar preparación**.
2. Docencia → curso → **Preparación** → **Nueva práctica**.
3. Completar título e instrucciones; agregar preguntas con dos a ocho opciones, marcar una correcta y escribir una explicación opcional.
4. Guardar un borrador o publicar. Se admiten hasta 80 preguntas y 200 KB. Para guardar, todas las preguntas agregadas deben estar completas; un borrador puede guardarse sin preguntas.
5. Los alumnos matriculados ven las prácticas publicadas, inician un intento y finalizan para obtener su corrección. Las omitidas cuentan como incorrectas. No hay límite de intentos ni temporizador.
6. **Mis intentos** permite retomar o revisar. Las selecciones pendientes permanecen sólo en la pestaña del navegador; el cuestionario del intento se conserva en el servidor.
7. **Seguimiento de alumnos** permite consultar intentos en curso y corregidos. Archivar o volver a borrador impide iniciar intentos nuevos; los existentes conservan la versión con la que comenzaron.

Deshabilitar la sección oculta su navegación y bloquea operaciones y lecturas hasta volver a habilitarla. Los datos se conservan. No se habilitan cursos automáticamente.

## Persistencia y despliegue

Ejecutar `npm run schema:preparation` con las credenciales de servicio ya configuradas en `.env.local`. El script respalda el esquema en `backups/pocketbase/` antes de la migración aditiva. El servidor Next.js requiere las mismas credenciales de servicio usadas por las funciones existentes. Después desplegar la aplicación y activar únicamente los cursos deseados.

- `courses.preparationEnabled`: activación administrativa.
- `practice_quizzes`: preguntas y soluciones privadas para docentes asignados.
- `practice_attempts`: snapshot privado de cada intento. El servidor entrega a su dueño una versión sin claves ni explicaciones antes de finalizar.
- `practice_results`: revisión inmutable; índice único por intento. El primer envío persistido es definitivo y los reintentos devuelven el mismo resultado.

PocketBase bloquea escrituras directas a intentos y resultados. Las acciones del servidor comprueban sesión, matrícula, curso habilitado y propiedad. Los alumnos sólo pueden leer directamente sus resultados corregidos mientras conserven matrícula y la sección esté habilitada. Los docentes acceden únicamente a cursos asignados. No se borran cuestionarios desde la interfaz; se archivan para conservar el historial.

Para revertir el despliegue, desactivar la opción y conservar las colecciones; no borrar intentos ni resultados.

## Comprobaciones

Pruebas unitarias: `npx vitest run lib/preparation.test.ts lib/actions-courses.test.ts components/preparation/PreparationNavigation.test.tsx`.

Integración real optativa: definir `PREPARATION_INTEGRATION=1` y ejecutar `npx vitest run lib/preparation.integration.test.ts`. Usa cursos y cuentas temporales que elimina al finalizar. Verifica protección de claves, alcance, matrícula revocada, curso deshabilitado, snapshot, archivo, inmutabilidad y envíos concurrentes.

El script `scripts/preparation-browser-fixture.mjs create` prepara dos cuentas y un curso temporal para pruebas de navegador; `cleanup` elimina exclusivamente esos registros y sus credenciales locales. `tmp/preparation/` queda excluido de Git.

Verificación realizada el 4 de octubre de 2026: pruebas unitarias, integración con PocketBase, lint y compilación de producción. En navegador se comprobó guardar un borrador, editarlo y publicarlo, iniciar dos intentos como alumno, conservar selecciones al recargar, corregir respuestas incorrectas y correctas, mostrar la explicación sólo al terminar, consultar ambos intentos como docente y archivar la práctica conservando el historial. La resolución se revisó también a 390 px de ancho, sin desbordamiento horizontal.
