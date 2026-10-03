## Why

Los docentes necesitan preparar materiales interactivos y vincularlos a sus clases antes de conducir encuentros en vivo. Esta primera etapa establece esa gestión dentro de Epixum, respetando los permisos del curso y preparando el contenido para futuras sesiones de hasta 100 alumnos.

## What Changes

- Opción administrativa «Clases interactivas», deshabilitada por defecto y reversible sin pérdida de materiales.
- Biblioteca docente global y por curso para crear, editar, previsualizar y eliminar materiales, vinculables a una clase del mismo curso.
- Importación de materiales preparados con ayuda de Codex: pantallas de contenido, opción múltiple, encuestas y respuestas breves, con formato validado y ejemplo incluido.
- Estados borrador y preparado; preparar requiere material válido y clase asociada. La vista previa es privada y no inicia una sesión.
- Documentación del contrato y de la siguiente etapa: acceso con cuenta y código, presencia, pantallas sincronizadas y respuestas para consulta docente, sin calificaciones.

## Capabilities

### New Capabilities

- `interactive-class-management`: habilitación, biblioteca, asociación, preparación y vista previa privada de clases interactivas.

### Modified Capabilities

Ninguna; la nueva capacidad agrega un recurso separado sin cambiar la publicación de clases ni de contenidos existentes.

## Impact

- Next.js: formulario administrativo, navegación y páginas docentes, acciones y validación compartida.
- PocketBase: campo `courses.interactiveClassesEnabled` y colección `interactive_lessons` con acceso docente por curso; migración aditiva e idempotente y reglas de protección del nuevo campo.
- No se modifica la autenticación, las matrículas, las entregas ni las notas. No se agregan dependencias.
- No se incluyen todavía sesiones en vivo, códigos de acceso, respuestas de alumnos ni garantía de capacidad concurrente. Los 100 alumnos por sesión son el objetivo de validación de la siguiente etapa.
