# Encuestas por curso

La administración habilita **Encuestas** desde la configuración de cada curso. El valor inicial es deshabilitado. Deshabilitar bloquea la sección y sus acciones, conserva los registros y permite recuperarlos al volver a habilitarla.

## Uso

1. El administrador marca **Habilitar encuestas** y guarda el curso.
2. El docente asignado abre **Encuestas → Crear encuesta**, completa título, descripción, privacidad y fecha de cierre opcional.
3. Agrega y ordena preguntas de opción única, selección múltiple, escala de 1 a 5 o respuesta abierta. Cada pregunta puede ser obligatoria u opcional.
4. Guarda el borrador y publica la versión guardada. La interfaz bloquea publicar o duplicar mientras existan cambios sin guardar.
5. Los alumnos matriculados responden una vez. Se valida nuevamente el acceso y la fecha al enviar.
6. El equipo docente consulta gráficos, porcentajes y textos. Puede cerrar la encuesta manualmente o dejar que venza la fecha configurada. Para cambiar un diseño publicado, duplica la encuesta y edita la copia.

Los borradores solo son visibles para administradores y docentes asignados. Solo se pueden eliminar borradores. No se modifican ni eliminan respuestas enviadas desde la interfaz. Los alumnos no acceden a los resultados del grupo.

## Privacidad

En las encuestas identificadas los resultados incluyen el nombre del alumno y sus respuestas. En las anónimas, la participación se guarda separada del contenido, sin enlace entre ambos registros, sin alumno en la respuesta y sin fechas automáticas en las colecciones de participación y respuestas. La aplicación muestra agregados y textos separados por pregunta, ordenados por contenido, sin filas individuales, identificadores de respuesta ni orden de envío.

El aviso al alumno pide evitar información que lo identifique en los textos. El anonimato de la aplicación no impide inferencias por el contenido, grupos pequeños ni acceso operativo de quienes administran la infraestructura. La modalidad queda fija al publicar.

La configuración de Next.js desactiva el registro automático de argumentos de Server Functions en desarrollo para que los envíos no aparezcan en los logs del servidor local.

## Persistencia y concurrencia

- `courses.surveysEnabled`: configuración administrativa protegida también por la regla de actualización de cursos.
- `course_surveys`: diseño, estado, cierre y revisión.
- `course_survey_participations`: índice único por encuesta/alumno para impedir duplicados.
- `course_survey_responses`: respuestas, con alumno solo para modalidad identificada.
- `course_survey_openings`: apertura vigente que valida los envíos dentro de la transacción. Cerrar elimina la apertura; las respuestas anteriores se conservan y las referencias obsoletas se rechazan.
- `course_survey_revisions`: consumo único de revisiones para impedir que dos cambios docentes sobrescriban la misma versión.

Las cinco colecciones de encuestas son privadas, incluso para administradores normales de la aplicación. Solo el servicio de servidor las consulta tras comprobar sesión, función habilitada, asignación docente o matrícula vigente y pertenencia de la encuesta al curso. La creación de participación y respuesta se confirma en un único lote transaccional. Distintos alumnos no compiten por una revisión compartida.

## Instalación y validación

Ejecutar `npm run schema:surveys` con las credenciales de servicio del proyecto configuradas en `.env.local`. El script comprueba salud, guarda un respaldo en `backups/pocketbase/`, añade el esquema de forma idempotente y verifica que ni el inventario de cursos ni su habilitación hayan cambiado. Requiere lotes habilitados con al menos cuatro operaciones. No activa ningún curso.

Desplegar el código después del esquema. Para retirar temporalmente la función, deshabilitarla en los cursos; conservar las colecciones y sus datos.

Comprobaciones reproducibles:

```text
npm run schema:surveys:test
npx vitest run lib/course-surveys.test.ts lib/course-survey-service.test.ts components/surveys/Surveys.test.tsx lib/actions-courses.test.ts components/CourseForm.test.tsx
npm run test:surveys:integration
```

La integración real crea cuentas y un curso temporales y los elimina al terminar. Comprueba autorización, privacidad, publicación, conservación al deshabilitar, reintentos concurrentes y reversión transaccional de un envío en vuelo tras el cierre. Las pruebas habituales no ejecutan esta integración salvo que se active explícitamente.

Para verificación manual con Playwright, `node scripts/course-survey-e2e-fixture.mjs create` crea un curso y sesiones temporales bajo `tmp/surveys/`. Usar solo con una aplicación local en `127.0.0.1`. Al terminar ejecutar `node scripts/course-survey-e2e-fixture.mjs cleanup`; elimina exclusivamente los registros creados por esa prueba y sus credenciales locales.

## Verificación del cambio (30 de octubre de 2026)

- 74 pruebas de aplicación y regresión, 63 de esquema y 6 de integración real aprobadas.
- Compilación de producción y TypeScript aprobados; todas las rutas de encuestas se generan correctamente.
- Recorrido Playwright con administrador, docente y alumno: configuración, edición, bloqueo de publicación con cambios pendientes, publicación, envío y resultados. Inspección visual de formulario móvil y resultados de escritorio.
- Migración aplicada con respaldo y comprobación final: cinco colecciones privadas con todas sus reglas bloqueadas, cero cursos habilitados y cero cursos temporales remanentes.
- Lint de los 38 archivos de código modificados o nuevos: cero errores y cero advertencias. El lint global encuentra 47 errores y 49 advertencias en archivos ajenos al cambio, principalmente bajo `tmp/` y materiales privados.
