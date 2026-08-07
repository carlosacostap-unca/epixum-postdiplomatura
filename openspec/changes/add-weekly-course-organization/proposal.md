## Why

Epixum necesita admitir cursos cuya estructura pedagógica se organiza por semanas sin alterar el funcionamiento de los cursos actuales. Esta modalidad debe permitir que el administrador elija la organización del curso y que sus docentes construyan, publiquen y mantengan el recorrido semanal de forma autónoma.

## What Changes

- Incorporar en cada curso una modalidad de organización `tradicional` o `semanal`, configurable únicamente por administradores.
- Crear semanas de curso administradas por los docentes asignados, con número y título obligatorios, fechas opcionales y estados `borrador`, `publicada` o `programada`.
- Publicar automáticamente las semanas programadas al alcanzar su fecha y hora de publicación.
- Permitir relacionar clases, trabajos prácticos y consultas con una semana del mismo curso, conservando una bandeja docente de contenido sin asignar.
- Exigir que las nuevas consultas creadas por estudiantes en un curso semanal pertenezcan a una semana, sin ofrecer consultas generales de curso.
- Mostrar a los estudiantes únicamente semanas publicadas o cuya programación ya se cumplió, junto con su contenido autorizado.
- Conservar las relaciones semanales al volver un curso a modalidad tradicional y restaurarlas si posteriormente vuelve a modalidad semanal.
- Migrar el esquema y las reglas de PocketBase de forma idempotente, preservando todos los cursos y contenidos existentes.

## Capabilities

### New Capabilities

- `weekly-course-organization`: Creación, orden, estados, programación, visibilidad y gestión docente de semanas dentro de cursos configurados con modalidad semanal.

### Modified Capabilities

- `course-management-and-enrollment`: La administración de cursos incorpora la modalidad de organización y conserva la estructura semanal al alternarla.
- `classes-and-resources`: Las clases pueden asignarse a semanas del mismo curso y mostrarse agrupadas según la modalidad.
- `assignments-deliveries-and-evaluation`: Los trabajos prácticos pueden asignarse a semanas sin alterar entregas, vencimientos ni evaluaciones.
- `inquiries-and-discussion`: Las consultas de estudiantes en cursos semanales requieren una semana y dejan de admitir el contexto general del curso.
- `pocketbase-data-and-security`: PocketBase incorpora semanas, relaciones opcionales, reglas de alcance y una migración idempotente compatible con datos existentes.

## Impact

- Afecta el formulario administrativo de cursos y las vistas de curso de administración, docencia y estudiantes.
- Añade una colección `course_weeks`, un campo de modalidad en `courses` y relaciones opcionales de semana en `classes`, `assignments` e `inquiries`.
- Requiere acciones de servidor y reglas de PocketBase que validen rol, asignación docente, pertenencia de curso y visibilidad de cada semana.
- Requiere adaptar consultas, portadas, navegación contextual, formularios de contenido y filtros para distinguir contenido semanal y sin asignar.
- Los cursos existentes se migran como `tradicional` y ningún contenido existente se elimina ni se asigna automáticamente.
- No modifica autenticación, matrículas, almacenamiento de archivos, entregas existentes ni envío de correos.
