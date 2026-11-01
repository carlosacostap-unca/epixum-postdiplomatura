# Verificación — 1 de noviembre de 2026

- 61 pruebas de contrato, servicio, destinatarios, contenido e interfaz: aprobadas.
- 4 pruebas de esquema (base y migración): aprobadas.
- 9 pruebas de integración con PocketBase real (6 existentes y 3 de segmentación): aprobadas. Incluyen select vacío anterior, los tres estados, resultado pendiente, borrador sin publicar, retiro, cambio de grupo, anonimato y bloqueo al deshabilitar resultados.
- `npx tsc --noEmit`, ESLint de los archivos del cambio, `git diff --check` y validación estricta de OpenSpec: aprobados.
- `npm run build -- --webpack`: aprobado, con generación de páginas y tipos completos. Se usó webpack también para la revisión visual porque Turbopack falló al crear su proceso CSS en Windows; no se cambió la configuración del proyecto.
- Playwright: guardado docente del destinatario y bloqueo de publicación con cambios pendientes; listado exclusivo para aprobados; envío anónimo confirmado; URL del otro grupo denegada; No completó recibió el grupo conjunto; pendiente vio el estado vacío; vista móvil sin desbordamiento del cuestionario; administración mostró los dos borradores reales.
- Evidencia visual local ignorada por Git: `output/playwright/survey-targeting-approved-mobile.png` y `output/playwright/critical-thinking-survey-drafts.png`.
- Todos los cursos, usuarios, resultados y credenciales temporales de las verificaciones se eliminaron. No queda manifiesto ni archivos de sesión de esta prueba.

## Estado de los datos reales

La migración guardó un respaldo y conservó los IDs de encuestas, participaciones y respuestas. Los dos borradores del curso `mgk8u25zr4krpaw` son anónimos, tienen diez preguntas y cero respuestas. Se comprobó una segunda ejecución de preparación con cero mutaciones. Se habilitó únicamente encuestas; resultados permanece deshabilitado, con cero resultados académicos. La cohorte `5wdbs1o1p22vszm` conserva su estado borrador y ambas funciones deshabilitadas.

No se publicaron encuestas ni resultados, ni se desplegó la aplicación. Los cuestionarios completos y la secuencia de despliegue/publicación están en `docs/encuestas-pensamiento-critico.md` y `docs/survey-outcome-targeting.md`. Los demás cambios locales preexistentes no se modificaron ni se agregaron a Git.
