## Why

Los docentes necesitan consultar a los alumnos con preguntas adaptadas al curso. La encuesta fija del onboarding no permite diseñar ni repetir consultas y la administración necesita decidir qué cursos ofrecen esta función.

## What Changes

- Habilitación administrativa de encuestas por curso, desactivada por defecto y con conservación al deshabilitar.
- Sección Encuestas para docentes y alumnos matriculados, independiente de las unidades.
- Editor visual de preguntas de opción única, selección múltiple, escala de 1 a 5 y texto; orden y obligatoriedad configurables.
- Borradores, publicación, cierre opcional por fecha, duplicación y resultados con gráficos y respuestas abiertas.
- Una participación por alumno, con modalidad identificada o anónima elegida antes de publicar.

## Capabilities

### New Capabilities
- `course-surveys`: configuración, autoría, participación y resultados de encuestas por curso.

### Modified Capabilities

Ninguna. La configuración específica de encuestas se define en la nueva capacidad.

## Impact

Next.js: formulario administrativo, navegación de cursos, páginas por rol y acciones de servidor. PocketBase: campo booleano y colecciones nuevas para encuestas, participaciones y respuestas, con acceso exclusivo del servidor. Migración aditiva e idempotente, sin alterar matrículas ni encuestas del onboarding. Sin dependencias nuevas.
