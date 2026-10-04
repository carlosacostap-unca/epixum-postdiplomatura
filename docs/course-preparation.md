# Preparación de evaluaciones

Sección opcional por curso para practicar preguntas de opción múltiple. Una respuesta correcta, intentos ilimitados y devolución al confirmar cada pregunta, con resumen completo al terminar. El avance se guarda en la cuenta del alumno. El docente consulta intentos, resultados y respuestas; no se modifican las notas de trabajos prácticos.

## Uso

1. Administración → editar curso → **Habilitar preparación**.
2. Docencia → curso → **Preparación** → **Nueva práctica**.
3. Completar título e instrucciones; agregar preguntas con dos a ocho opciones, marcar una correcta y escribir una explicación opcional.
4. Guardar un borrador o publicar. Se admiten hasta 80 preguntas y 200 KB. Para guardar, todas las preguntas agregadas deben estar completas; un borrador puede guardarse sin preguntas.
5. Los alumnos matriculados ven las prácticas publicadas y eligen **Comenzar o continuar**. Se muestra una pregunta por vez; **Confirmar respuesta** guarda la opción y revela su corrección y explicación. La respuesta queda fija en ese intento. **Siguiente pregunta** avanza; **Pregunta anterior** permite repasar devoluciones guardadas.
6. Al volver a un intento con progreso se ofrece **Continuar donde quedé** (primera pregunta pendiente) o **Empezar de cero** (otro intento, conservando el anterior). Las respuestas confirmadas se recuperan desde otra sesión o dispositivo. Una opción seleccionada sin confirmar todavía no está guardada. **Mis intentos** permite retomar intentos anteriores.
7. Después de confirmar todas las preguntas se genera el resultado. La última devolución ofrece **Ver resumen final**, con cada respuesta, aciertos, errores y explicaciones. No hay límite de intentos ni temporizador.
8. **Seguimiento de alumnos** permite consultar el avance y las respuestas confirmadas de los intentos en curso, además de los resultados. Archivar o volver a borrador impide iniciar intentos nuevos; los existentes pueden retomarse y conservan su versión inicial.

Deshabilitar la sección oculta su navegación y bloquea operaciones y lecturas hasta volver a habilitarla. Los datos se conservan. No se habilitan cursos automáticamente.

## Persistencia y despliegue

Ejecutar `npm run schema:preparation` con las credenciales de servicio ya configuradas en `.env.local`. El script respalda el esquema en `backups/pocketbase/` antes de la migración aditiva. El servidor Next.js requiere las mismas credenciales de servicio usadas por las funciones existentes. Después desplegar la aplicación y activar únicamente los cursos deseados.

- `courses.preparationEnabled`: activación administrativa.
- `practice_quizzes`: preguntas y soluciones privadas para docentes asignados.
- `practice_attempts`: snapshot privado de cada intento. El servidor entrega preguntas sin claves ni explicaciones pendientes.
- `practice_answers`: respuestas confirmadas e inmutables. Índice único `(attempt, questionId)`; las soluciones se derivan del snapshot sólo para preguntas respondidas. Lecturas y escrituras directas bloqueadas.
- `practice_results`: revisión inmutable; índice único por intento. El primer envío persistido es definitivo y los reintentos devuelven el mismo resultado.

PocketBase bloquea escrituras directas a intentos, respuestas y resultados. Las acciones del servidor comprueban sesión, matrícula, curso habilitado, propiedad, opción válida y orden de preguntas. La primera respuesta persistida gana ante un doble envío, incluso si las opciones difieren. La corrección final usa exclusivamente respuestas guardadas y exige completar el cuestionario. Si falla la devolución después de guardar, el reintento recupera lo persistido. Los docentes acceden únicamente a cursos asignados. No se borran cuestionarios desde la interfaz; se archivan para conservar el historial.

La migración añade `practice_answers` sin alterar intentos ni resultados anteriores. Ejecutarla antes de desplegar la nueva aplicación. Los resultados históricos siguen mostrando la corrección original; los intentos antiguos abiertos empiezan sin respuestas confirmadas, ya que sus antiguas selecciones sólo existían en la pestaña del navegador.

Para revertir el despliegue, desactivar la opción y conservar las colecciones; no borrar intentos ni resultados.

## Comprobaciones

Pruebas unitarias: `npx vitest run lib/preparation.test.ts lib/actions-courses.test.ts components/preparation/PreparationNavigation.test.tsx components/preparation/PracticeRunner.test.tsx`.

Integración real optativa: definir `PREPARATION_INTEGRATION=1` y ejecutar `npx vitest run lib/preparation.integration.test.ts`. Usa cursos y cuentas temporales que elimina al finalizar. Verifica protección de claves pendientes, orden, alcance, matrícula revocada, curso deshabilitado, snapshot, archivo, reanudación entre sesiones, nuevo intento sin borrar el previo, inmutabilidad, respuestas concurrentes y resultados históricos.

El script `scripts/preparation-browser-fixture.mjs create` prepara dos cuentas y un curso temporal para pruebas de navegador; `cleanup` elimina exclusivamente esos registros y sus credenciales locales. `tmp/preparation/` queda excluido de Git.

La primera versión fue verificada el 4 de octubre de 2026 con pruebas unitarias, integración, lint, compilación y navegador. La revisión de feedback por pregunta agrega pruebas de interfaz para confirmación, explicación, reanudación, reinicio, fallo de guardado y resumen final.

Recorrido adicional en navegador: responder incorrectamente, ver devolución sin revelar la solución siguiente, borrar almacenamiento local y recargar, elegir empezar de cero, regresar al intento anterior y continuar desde la segunda pregunta, responder correctamente y ver ambas devoluciones en el resumen. La devolución se inspeccionó también a 390 px sin desbordamiento. Se eliminaron el curso y las cuentas temporales del ensayo.
