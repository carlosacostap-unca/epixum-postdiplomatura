## Context

Ver proposal.md. PocketBase es accesible directamente: las claves necesitan protección en la persistencia además de la interfaz. La activación sigue las otras secciones opcionales del curso.

## Goals / Non-Goals

Goals: editor visual, publicación, intento individual y seguimiento con permisos de curso.
Non-Goals: examen oficial, temporizador, proctoring, preguntas abiertas o sincronización en vivo.

## Decisions

- Preferencias confirmadas por el usuario: una correcta, intentos ilimitados y corrección con explicación al terminar; los docentes consultan intentos, resultados y respuestas sin modificar notas oficiales.
- practice_quizzes: cuestionarios completos privados para docentes. practice_attempts: snapshot privado al iniciar. practice_results: resultado corregido inmutable con índice único por intento. DTO público explícito sin claves durante la resolución.
- Escrituras de intentos/resultados sólo mediante servidor con cliente de servicio, comprobando autenticación, matrícula, curso habilitado, publicación y propiedad. Lectura directa de snapshots bloqueada para alumnos. Resultados visibles a su dueño matriculado y a docentes asignados.
- Snapshot evita recalcular con preguntas editadas. Crear un resultado único evita carreras entre dos finalizaciones. Archivar impide iniciar prácticas nuevas y preserva historial.
- Listados paginados de 20, máximo 80 preguntas y 200 KB. Selecciones provisionales en sessionStorage, sin guardar claves; se conserva la versión del intento en el servidor.

## Risks / Trade-offs

- Acceso de servicio elevado → autorización antes de leer datos privados, pruebas de curso ajeno y matrícula revocada.
- Doble envío → unicidad de resultado y lectura del ya guardado.
- Datos históricos → archivo en lugar de borrado destructivo.

## Migration Plan

Respaldar esquema, agregar campo booleano y colecciones, verificar reglas con cuentas temporales y desplegar. No habilitar cursos reales automáticamente. Reversión: desactivar sección y conservar historial al volver al código anterior.
