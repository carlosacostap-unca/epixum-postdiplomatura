## Context

Ver proposal.md. PocketBase es accesible directamente: las claves necesitan protección en la persistencia además de la interfaz. La activación sigue las otras secciones opcionales del curso.

## Goals / Non-Goals

Goals: editor visual, publicación, intento individual y seguimiento con permisos de curso.
Non-Goals: examen oficial, temporizador, proctoring, preguntas abiertas o sincronización en vivo.

## Decisions

- Preferencias vigentes: una correcta, intentos ilimitados y explicación al confirmar cada respuesta; resumen al terminar. Los docentes consultan intentos, resultados y respuestas sin modificar notas oficiales.
- practice_quizzes: cuestionarios completos privados para docentes. practice_attempts: snapshot privado al iniciar. practice_results: resultado corregido inmutable con índice único por intento. DTO público explícito sin claves durante la resolución.
- Escrituras de intentos/resultados sólo mediante servidor con cliente de servicio, comprobando autenticación, matrícula, curso habilitado, publicación y propiedad. Lectura directa de snapshots bloqueada para alumnos. Resultados visibles a su dueño matriculado y a docentes asignados.
- Snapshot evita recalcular con preguntas editadas. Crear un resultado único evita carreras entre dos finalizaciones. Archivar impide iniciar prácticas nuevas y preserva historial.
- Listados paginados de 20, máximo 80 preguntas y 200 KB. practice_answers conserva cada respuesta confirmada en servidor, con índice único (attempt, questionId). Sus escrituras y lecturas directas están bloqueadas; el servidor valida propietario, matrícula y orden antes de insertar. La primera respuesta persistida gana; sólo las preguntas contestadas revelan su solución.
- El avance se deriva de las respuestas guardadas: se retoma la primera pendiente y se pueden revisar las devoluciones anteriores. Al entrar en un intento con progreso se ofrece continuar o empezar otro, sin borrar el anterior. La última respuesta permite generar el resultado único desde respuestas persistidas, recuperable ante reintentos. Los resultados históricos se conservan; los intentos antiguos abiertos sin respuestas confirmadas empiezan en la primera pregunta.

## Risks / Trade-offs

- Acceso de servicio elevado → autorización antes de leer datos privados, pruebas de curso ajeno y matrícula revocada.
- Doble envío → unicidad de resultado y lectura del ya guardado.
- Datos históricos → archivo en lugar de borrado destructivo.

## Migration Plan

Respaldar esquema, agregar campo booleano y colecciones, verificar reglas con cuentas temporales y desplegar. No habilitar cursos reales automáticamente. Reversión: desactivar sección y conservar historial al volver al código anterior.
