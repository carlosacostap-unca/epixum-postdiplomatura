# Preevaluación del TP1 de Pensamiento Crítico

Configuración inicial guardada el 13 de octubre de 2026; revisión flexible, devolución breve y neutralidad respecto de la herramienta actualizadas el 15 de octubre de 2026 en PocketBase de Postdiplomatura.

- Curso: Pensamiento Crítico y Resolución de Problemas en Entornos de Inteligencia Artificial (`mgk8u25zr4krpaw`).
- Trabajo: Trabajo Práctico 1 (`3rroynqs1ms3c9c`).
- Rúbrica activa: `w8rlnu29ccgtjt0`, versión 3. IA habilitada para el curso.
- Copia reproducible: [pensamiento-critico-tp1-config.json](./pensamiento-critico-tp1-config.json).

| Criterio del enunciado | Peso |
| --- | --- |
| Formulación clara del problema | 20% |
| Desagregación en partes y etapas | 20% |
| Revisión crítica de la propuesta de IA y verificación | 20% |
| Prompts acotados y vinculados al esquema | 20% |
| Reflexión y criterio propio | 20% |

Escala de 0 a 10; desde 6, `Aprobado`; debajo de 6, `Corregir y reenviar`. Revisión introductoria MUY LAXA: se valora participación, esfuerzo y comprensión general. Una entrega sencilla con avances comprensibles puede aprobar aunque omita apartados, prompts literales, referencias formales o distinciones precisas entre partes y etapas. Las omisiones secundarias son recomendaciones, sin acumulación de descuentos ni requisitos eliminatorios. El reenvío queda reservado a casos excepcionales sin trabajo sustancialmente evaluable o ajenos a la consigna; las limitaciones de lectura no demuestran incumplimiento. Los pesos iguales y la escala son decisiones de configuración; el enunciado no especificaba pesos.

## Mensaje para el estudiante

Desde la versión 2 se elige `studentFeedbackMode: message_only`: sólo se prepara `proposedMessage` en la devolución oficial, sin anexar el informe técnico. El mensaje es un párrafo cercano de 50 a 90 palabras (máximo 100), reconoce un avance concreto y puede sugerir una mejora sencilla y opcional. No incluye referencias a preevaluación, IA evaluadora, nota sugerida, rúbrica, cobertura ni metadatos; puede mencionar la herramienta usada por el estudiante cuando sea pertinente y esté identificada. La nota y el veredicto se muestran en sus campos propios.

El docente conserva el detalle privado de criterios, fortalezas, correcciones y cobertura, y revisa el mensaje antes de guardar o publicar. El formato se conserva en el snapshot de cada nueva revisión. Los intentos anteriores conservan su formato y las devoluciones guardadas no se reescriben. Para obtener el nuevo criterio y mensaje, solicitar una nueva preevaluación. Otros trabajos mantienen el informe completo por defecto.

La migración `npm run schema:ai-feedback` agrega un campo opcional a `assignment_ai_configs`, sin cambiar permisos o datos históricos. Las nuevas instalaciones del esquema general ya incluyen el campo. La configuración de severidad y tono se aplica desde PocketBase; el formato de mensaje sin informe agregado requiere desplegar el código actualizado.

Validación del 15/10: configuración versión 2 guardada y leída nuevamente, permisos conservados, 36 pruebas de configuración, servicio, informe e interfaz aprobadas, cuatro pruebas de esquema aprobadas, TypeScript, lint de archivos modificados y build correctos. Con autorización docente se probó el modelo actual con una entrega ficticia sencilla sin transcripciones ni fuentes formales: resultado `Aprobado`, nota 8.5 y mensaje de 72 palabras sin referencias a preevaluación ni metadatos. No se enviaron entregas reales ni se modificaron notas o devoluciones anteriores.

El enunciado publicado pide seis componentes: planteo inicial, formulación, desagregación propia, desagregación con IA y revisión, resolución de una parte con prompts y al menos un dato verificado indicando dónde, y reflexión. No se añaden los requisitos diferentes presentes en algunos materiales de clase ni criterios de programación.

## Elección libre de herramienta

La versión 3 explicita que el curso es agnóstico de la herramienta: Gemini, ChatGPT, Claude, Copilot y otras alternativas son igualmente válidas. No se exige Gemini, no se descuenta por elegir otro asistente ni por no identificar su nombre, y la devolución no recomienda cambiar de herramienta. Se valora el proceso y las decisiones, sin inventar qué herramienta se usó. Las menciones a Gemini en materiales anteriores se interpretan como ejemplos.

Se neutralizaron las referencias específicas en criterios, controles y orientación del mensaje, y se actualizó el enunciado publicado del TP1 para permitir cualquier herramienta de IA. Se mantienen la revisión muy laxa, los pesos, la escala y el formato breve. Es un ajuste de datos con efecto en las nuevas preevaluaciones, sin reescribir resultados anteriores ni requerir un nuevo despliegue de código.

El docente confirmó que no se penaliza la diferencia entre los cuatro elementos mencionados por el TP y los cinco apoyos de clase: contexto, objetivo, criterios, restricciones y formato. Tampoco se descuenta por paginación no verificable, limitaciones de lectura de imágenes o los horarios de vencimiento distintos de los materiales publicados.

## Soporte documental

El código local admite archivos PDF, DOCX, TXT y Markdown almacenados en el bucket del aula, enlaces a esos archivos y Google Docs públicos. Google Docs se exporta como texto, sin usar cuentas conectadas; se sigue sólo la exportación hacia hosts Google permitidos. Otros enlaces requieren subir el documento al aula. Se conserva el flujo de repositorios públicos GitHub, que selecciona texto y código y no lee los PDF/DOCX alojados dentro de esos repositorios.

El servidor autoriza al docente antes de leer la entrega o consultar OpenAI. Descarga hasta cinco archivos, con máximo de 10 MiB por archivo y 20 MiB en conjunto, tiempos acotados y sin ejecutar contenido. Envía los archivos nativamente a Responses con `store: false`, sin herramientas. El PDF aporta texto e imágenes; DOCX y Google Docs aportan texto, con límites visuales explicitados. Se usan etiquetas anónimas para archivos, aunque el contenido puede contener datos personales: el modelo recibe instrucciones de no reproducirlos en la devolución.

Referencia del contrato de lectura: [File inputs, documentación oficial de OpenAI](https://developers.openai.com/api/docs/guides/file-inputs).

Los intentos documentales guardan tipo de fuente, huella SHA-256 del conjunto, versión de entrega y hash de las referencias. El campo de commit GitHub queda vacío. La adopción como borrador o publicación comprueba de nuevo versión, referencias y contenido; una modificación externa requiere nueva preevaluación. Las propuestas documentales identifican el contenido leído en ese momento, sin afirmar que sea el de la fecha original de entrega ni demostrar autoría o cronología.

La migración añade cuatro campos opcionales y permite dejar vacío el commit; conserva los intentos previos, índices y permisos. Se aplicó en la instancia real y se verificó su conservación. Para otra instancia existente: `npm run schema:ai-documents`. Las instalaciones mediante el esquema general ya incluyen estos campos.

## Estado de publicación

La configuración y el esquema están aplicados en PocketBase. El soporte documental y el formato breve se verificaron en `https://epixum.com` el 15/10 mediante una entrega sintética aislada: el mensaje se preparó sin anexo técnico y el detalle permaneció disponible para el docente; los registros de prueba se eliminaron. El despliegue de código es automático al hacer push a `main`. Para utilizar la configuración vigente, abrir una entrega y seleccionar **Solicitar nueva preevaluación**, revisar el mensaje y guardar borrador o confirmar publicación.

La prueba externa leyó correctamente un PDF y un DOCX sintéticos con el modelo actual y salida estructurada. No se enviaron informes reales de estudiantes a OpenAI ni se modificaron notas o devoluciones.

Prueba reproducible de configuración: `node scripts/verify-document-preevaluation.mjs`. Prueba externa opt-in: `node scripts/verify-document-preevaluation.mjs smoke` (dos consultas de documentos sintéticos). Migración: `node --test scripts/document-preevaluation-schema.test.mjs`.
