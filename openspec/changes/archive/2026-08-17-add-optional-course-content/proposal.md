## Why

Algunos cursos necesitan ofrecer material de estudio independiente de las clases y los trabajos prácticos. Epixum debe permitir que un administrador habilite esa experiencia sólo en los cursos que la requieren, sin alterar ni perder información de los demás.

## What Changes

- Incorporar una configuración administrativa por curso que habilite o deshabilite la sección independiente “Contenidos”, deshabilitada por defecto en cursos nuevos y existentes.
- Crear contenidos con título, descripción enriquecida, recursos de tipo archivo o enlace y una posición administrada manualmente.
- Permitir que únicamente los docentes asignados al curso creen, editen, eliminen y reordenen sus contenidos.
- Mostrar inmediatamente los contenidos creados a los estudiantes matriculados cuando la característica esté habilitada.
- Mantener los contenidos independientes de las semanas, incluso en cursos con organización semanal.
- Ocultar la sección y bloquear su acceso directo cuando la característica se deshabilite, conservando los registros, recursos y orden para una reactivación posterior.
- Extender el esquema, las reglas de acceso y la migración de PocketBase de forma idempotente y compatible con los datos existentes.

## Capabilities

### New Capabilities

- `course-content`: Gestión docente, orden manual, visibilidad y consulta estudiantil de contenidos independientes dentro de cursos habilitados.

### Modified Capabilities

- `course-management-and-enrollment`: La administración de cursos incorpora una configuración reversible para habilitar contenidos independientes.
- `classes-and-resources`: Los recursos de tipo archivo o enlace también pueden pertenecer a un contenido independiente.
- `pocketbase-data-and-security`: PocketBase incorpora la nueva colección, relaciones, reglas de alcance y una migración idempotente compatible con datos existentes.

## Impact

- Afecta el formulario administrativo de cursos, las vistas de curso de docentes y estudiantes, la navegación contextual y las acciones de servidor relacionadas.
- Añade un campo booleano a `courses`, una colección de contenidos ordenables y una relación opcional desde `links` hacia contenidos.
- Reutiliza el editor enriquecido y el flujo actual de archivos y enlaces respaldado por iDrive S3-compatible.
- Requiere reglas de PocketBase y validaciones de servidor para rol, asignación docente, matrícula, pertenencia al curso y estado de la característica.
- Los cursos nuevos y existentes comienzan con la característica deshabilitada; no se elimina ni transforma información al alternarla.
- No modifica clases, trabajos prácticos, semanas, consultas, matrículas, entregas ni evaluaciones existentes.
