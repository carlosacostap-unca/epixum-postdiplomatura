# Preparación de evaluaciones

Sección opcional por curso para practicar preguntas de opción múltiple o simular parciales y exámenes con tiempo límite. Una respuesta correcta e intentos ilimitados. El avance se guarda en la cuenta del alumno. Administradores y docentes asignados consultan intentos y resultados; no se modifican las notas oficiales.

## Simulaciones con duración

Administración → curso → **Habilitar preparación** → **Simulaciones de examen** → **Nueva simulación**. Los administradores pueden gestionar cuestionarios sin estar asignados como docentes. Los docentes asignados también acceden desde **Preparación**. Sólo administradores habilitan o deshabilitan la sección del curso.

En el editor, seleccionar **Simulación de parcial o examen con tiempo límite** y una duración de 1 a 240 minutos. Completar preguntas y publicar. Las simulaciones nuevas desde administración tienen esta opción marcada y 60 minutos como valor inicial editable. Las prácticas existentes siguen sin temporizador y conservan su comportamiento.

El alumno ve la duración antes de iniciar. El plazo se calcula en el servidor usando la fecha de creación y la duración conservada en el snapshot del intento. Recargar, salir, cambiar de dispositivo o modificar posteriormente el cuestionario no reinicia ni altera ese plazo. Al volver se retoma el mismo examen abierto; no se ofrece reiniciarlo mientras siga activo.

El alumno puede navegar y saltar preguntas. Cada respuesta se confirma una sola vez y permanece fija, sin revelar correcciones ni explicaciones durante el examen. Puede entregar anticipadamente; las omitidas y las incorrectas suman cero. Al agotarse el tiempo, la página entrega automáticamente. Si está cerrada o sin conexión, el servidor cierra el intento en el siguiente acceso, envío o consulta del historial, con el plazo original; nunca acepta respuestas guardadas después del vencimiento.

La nota simulada es `aciertos / total × 10`, redondeada a un decimal. Todas las preguntas valen lo mismo. La corrección completa aparece sólo al cerrar el intento. El resultado es definitivo e idempotente. Para practicar de nuevo, se inicia otro intento desde el listado después de finalizar el anterior.

`practice_quizzes.durationMinutes` es un número entero de 0 a 240: cero mantiene la práctica sin reloj; un valor positivo activa la simulación. No se requiere migrar los snapshots anteriores. La migración es aditiva y amplía las reglas de lectura y gestión para administradores, conservando las restricciones de matrícula, propiedad y escrituras de servicio.

## Uso

1. Administración → editar curso → **Habilitar preparación**.
2. Docencia → curso → **Preparación** → **Nueva práctica**.
3. Completar título e instrucciones; agregar preguntas con dos a ocho opciones, marcar una correcta y escribir una explicación opcional.
4. Guardar un borrador o publicar. Se admiten hasta 80 preguntas y 200 KB. Para guardar, todas las preguntas agregadas deben estar completas; un borrador puede guardarse sin preguntas.
5. Los alumnos matriculados ven las prácticas publicadas y eligen **Comenzar o continuar**. Se muestra una pregunta por vez; **Confirmar respuesta** guarda la opción y revela su corrección y explicación. La respuesta queda fija en ese intento. **Siguiente pregunta** avanza; **Pregunta anterior** permite repasar devoluciones guardadas.
6. Al volver a un intento con progreso se ofrece **Continuar donde quedé** (primera pregunta pendiente) o **Empezar de cero** (otro intento, conservando el anterior). Las respuestas confirmadas se recuperan desde otra sesión o dispositivo. Una opción seleccionada sin confirmar todavía no está guardada. **Mis intentos** permite retomar intentos anteriores.
7. En prácticas sin reloj, después de confirmar todas las preguntas se genera el resultado. La última devolución ofrece **Ver resumen final**, con cada respuesta, aciertos, errores y explicaciones. No hay límite de intentos.
8. **Seguimiento de alumnos** permite consultar el avance y las respuestas confirmadas de los intentos en curso, además de los resultados. Archivar o volver a borrador impide iniciar intentos nuevos; los existentes pueden retomarse y conservan su versión inicial.

Deshabilitar la sección oculta su navegación y bloquea operaciones y lecturas hasta volver a habilitarla. Los datos se conservan. No se habilitan cursos automáticamente.

## Persistencia y despliegue

Ejecutar `npm run schema:preparation` con las credenciales de servicio ya configuradas en `.env.local`. El script respalda el esquema en `backups/pocketbase/` antes de la migración aditiva. El servidor Next.js requiere las mismas credenciales de servicio usadas por las funciones existentes. Después desplegar la aplicación y activar únicamente los cursos deseados.

- `courses.preparationEnabled`: activación administrativa.
- `practice_quizzes`: preguntas y soluciones privadas para docentes asignados.
- `practice_attempts`: snapshot privado de cada intento. El servidor entrega preguntas sin claves ni explicaciones pendientes.
- `practice_answers`: respuestas confirmadas e inmutables. Índice único `(attempt, questionId)`; las soluciones se derivan del snapshot sólo para preguntas respondidas. Lecturas y escrituras directas bloqueadas.
- `practice_results`: revisión inmutable; índice único por intento. El primer envío persistido es definitivo y los reintentos devuelven el mismo resultado.

PocketBase bloquea escrituras directas a intentos, respuestas y resultados. Las acciones del servidor comprueban sesión, matrícula, curso habilitado, propiedad y opción válida; las prácticas sin reloj además exigen el orden de preguntas. La primera respuesta persistida gana ante un doble envío, incluso si las opciones difieren. La corrección final usa exclusivamente respuestas guardadas dentro del plazo. Las prácticas sin reloj exigen completar el cuestionario; los exámenes permiten omitidas. Si falla la devolución después de guardar, el reintento recupera lo persistido. Los docentes acceden únicamente a cursos asignados; los administradores gestionan todos los cursos habilitados. No se borran cuestionarios desde la interfaz; se archivan para conservar el historial.

La migración añade `practice_answers` sin alterar intentos ni resultados anteriores. Ejecutarla antes de desplegar la nueva aplicación. Los resultados históricos siguen mostrando la corrección original; los intentos antiguos abiertos empiezan sin respuestas confirmadas, ya que sus antiguas selecciones sólo existían en la pestaña del navegador.

Para revertir el despliegue, desactivar la opción y conservar las colecciones; no borrar intentos ni resultados.

## Comprobaciones

Pruebas unitarias: `npx vitest run lib/preparation.test.ts lib/actions-courses.test.ts components/preparation/PreparationNavigation.test.tsx components/preparation/PracticeRunner.test.tsx components/preparation/ExamRunner.test.tsx components/CourseAdminNavigation.test.tsx components/CourseForm.test.tsx`.

Integración real optativa: definir `PREPARATION_INTEGRATION=1` y ejecutar `npx vitest run lib/preparation.integration.test.ts`. Usa cursos y cuentas temporales que elimina al finalizar. Verifica protección de claves pendientes, orden, alcance, matrícula revocada, curso deshabilitado, snapshot, archivo, reanudación entre sesiones, nuevo intento sin borrar el previo, inmutabilidad, respuestas concurrentes y resultados históricos.

La ampliación de simulaciones se verificó el 14 de octubre de 2026 con pruebas de interfaz, validación de duración y nota, integración real y compilación de producción. La integración también verifica administración sin asignación docente, ocultamiento de soluciones, navegación libre, duración inmutable, respuestas fuera de plazo, cierre automático al consultar el historial y entrega anticipada con omitidas. La migración se aplicó con respaldo del esquema; se confirmó `preparationEnabled = true` en Fundamentos de Inteligencia Artificial (`tceqb7atji66fmd`). La nueva interfaz requiere desplegar esta versión de la aplicación.

El script `scripts/preparation-browser-fixture.mjs create` prepara dos cuentas y un curso temporal para pruebas de navegador; `cleanup` elimina exclusivamente esos registros y sus credenciales locales. `tmp/preparation/` queda excluido de Git.

La primera versión fue verificada el 4 de octubre de 2026 con pruebas unitarias, integración, lint, compilación y navegador. La revisión de feedback por pregunta agrega pruebas de interfaz para confirmación, explicación, reanudación, reinicio, fallo de guardado y resumen final.

Recorrido adicional en navegador: responder incorrectamente, ver devolución sin revelar la solución siguiente, borrar almacenamiento local y recargar, elegir empezar de cero, regresar al intento anterior y continuar desde la segunda pregunta, responder correctamente y ver ambas devoluciones en el resumen. La devolución se inspeccionó también a 390 px sin desbordamiento. Se eliminaron el curso y las cuentas temporales del ensayo.
