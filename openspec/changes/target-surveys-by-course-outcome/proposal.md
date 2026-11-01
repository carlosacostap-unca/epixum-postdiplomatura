## Why

Las encuestas actuales se ofrecen a todos los matriculados y no distinguen experiencias de aprobación o interrupción. El curso de Pensamiento Crítico necesita dos cuestionarios y asignación automática según el resultado final publicado de cada alumno.

## What Changes

- Destinatarios por encuesta: todos, Aprobado, o No aprobado/No completó.
- Comprobación de resultado publicado al listar, abrir y responder; sin resultado publicado o con resultados deshabilitados no se accede a encuestas segmentadas.
- Configuración inmutable tras publicar y conservada al duplicar; encuestas anteriores mantienen destinatarios «todos».
- Dos borradores anónimos para el curso activo de Pensamiento Crítico, con preguntas comunes y específicas, sin publicar ni cambiar resultados académicos.

## Capabilities

### New Capabilities
- `survey-outcome-targeting`: selección y control de destinatarios según el resultado publicado de cursada.

### Modified Capabilities

Ninguna especificación principal existente. Las capacidades de encuestas y resultados están documentadas en sus cambios previos.

## Impact

Contrato, editor, vistas y servicio de encuestas; campo select aditivo en PocketBase sin reescribir respuestas ni matrículas. Migración idempotente y compatibilidad con registros sin campo. Preparación de borradores en el curso activo, conservando deshabilitada la publicación y la configuración de resultados de cursada.
