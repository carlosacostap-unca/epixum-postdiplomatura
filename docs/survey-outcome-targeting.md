# Encuestas según resultado de cursada

El editor permite elegir Todos los alumnos matriculados, Aprobado o No aprobado/No completó. Los destinatarios quedan fijos al publicar y se conservan al duplicar. Las encuestas anteriores sin destinatario siguen disponibles para todos los matriculados, con sus controles habituales.

Para una encuesta segmentada se consulta únicamente el estado publicado del alumno autenticado en el mismo curso. No se usan el borrador, la nota, la devolución ni resultados de otro curso. El filtro se aplica al listado, la apertura y el envío, incluso por URL o acción directa. Se vuelven a comprobar matrícula, habilitación y elegibilidad antes de enviar. Si cambia o se retira el resultado publicado, cambian los accesos y se conservan las respuestas anteriores. Las colecciones y resultados siguen siendo privados.

## Publicación

1. Aplicar `npm run schema:survey-targeting` con las credenciales de `.env.local`. Guarda un respaldo de esquema e inventario en `backups/pocketbase/` y verifica que no cambien los registros de encuestas, participaciones ni respuestas. No hace backfill ni cambia reglas existentes.
2. Desplegar la aplicación con este cambio antes de publicar encuestas segmentadas. Una versión anterior al filtro no debe servir estas encuestas publicadas.
3. Habilitar encuestas y resultados de cursada en el curso. El equipo docente puede preparar borradores antes de habilitar resultados, pero el servidor impide publicar una encuesta segmentada mientras estén deshabilitados.
4. Publicar los resultados individuales y revisar/publicar cada encuesta. Los alumnos sin resultado publicado todavía no ven una encuesta segmentada. Las encuestas generales no necesitan resultados.

Si se deshabilitan resultados, las encuestas segmentadas dejan de estar disponibles para alumnos; sus respuestas permanecen. Para volver a código anterior, primero se deben deshabilitar las encuestas de los cursos con segmentadas: el código anterior no conoce los destinatarios y también muestra encuestas cerradas.

## Pensamiento Crítico

Se prepararon en el curso activo `mgk8u25zr4krpaw` dos borradores anónimos, de diez preguntas opcionales, sin fecha de cierre:

| Encuesta | Destinatarios | ID |
| --- | --- | --- |
| Balance del aprendizaje y aplicación del pensamiento crítico | Aprobado | `c2509c21c576cda` |
| Tu experiencia y próximos pasos en pensamiento crítico | No aprobado / No completó | `4b5002a029f9d83` |

Los cuestionarios completos están en [Encuestas de Pensamiento Crítico](encuestas-pensamiento-critico.md). Las seis primeras preguntas son comunes. Todas permiten omisión; se necesita al menos una respuesta para enviar, con validación visible antes de cualquier escritura.

La preparación habilitó solo encuestas. Resultados de cursada continúa deshabilitado y no se crearon ni modificaron resultados académicos. La otra cohorte se mantuvo sin cambios. Para repetir la preparación: `npm run surveys:critical-thinking:prepare`. Usa IDs estables, respalda el estado previo y no duplica, sobrescribe ni publica encuestas; si detecta una edición manual, se detiene.

## Verificación

- Contrato, elegibilidad, servicio, contenido y componentes: `npx vitest run lib/survey-audience.test.ts lib/course-surveys.test.ts lib/course-survey-service.test.ts lib/critical-thinking-surveys.test.ts components/surveys/Surveys.test.tsx`.
- Esquema: `node --test scripts/survey-targeting-schema.test.mjs scripts/course-survey-schema.test.mjs`.
- Integración real con fixtures que se eliminan al terminar: `npm run test:survey-targeting:integration` y `npm run test:surveys:integration`.
- Verificación visual: `node scripts/survey-targeting-e2e-fixture.mjs create`, sesiones en `tmp/survey-targeting/*-state.json` y `node scripts/survey-targeting-e2e-fixture.mjs cleanup` al finalizar. Las credenciales nunca se imprimen ni se agregan al repositorio.
