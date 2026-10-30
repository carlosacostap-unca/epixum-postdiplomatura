## Why

Algunos cursos necesitan comunicar a cada alumno su resultado final de cursada. El seguimiento actual reúne actividades y evaluaciones pero no permite preparar y publicar una decisión final individual con visibilidad opcional por curso.

## What Changes

- Configuración administrativa «Habilitar resultados de cursada», desactivada por defecto.
- Gestión por administradores y docentes asignados con estados Aprobado, No aprobado y No completó, nota opcional de 0 a 10 y devolución opcional.
- Borrador y publicación individual; las correcciones se preparan sin sustituir el resultado visible hasta su publicación.
- Resultado propio en el resumen del curso del alumno, sin listado de compañeros ni acceso a borradores.
- Historial privado de quién cambió o publicó cada resultado y cuándo; conservación al deshabilitar o retirar una matrícula.

## Capabilities

### New Capabilities
- `course-outcomes`: habilitación, preparación, publicación, privacidad e historial de resultados de cursada.

### Modified Capabilities

Ninguna. La configuración específica se define dentro de la nueva capacidad.

## Impact

Formulario y navegación de cursos, seguimiento docente y resumen estudiantil. PocketBase incorpora un campo booleano y dos colecciones privadas de resultados e historial. Migración aditiva e idempotente sin modificar matrículas ni calcular resultados desde notas anteriores. Sin nuevas dependencias.
