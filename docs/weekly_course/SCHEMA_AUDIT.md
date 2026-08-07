# Auditoría previa del esquema semanal

Fecha: 6 de agosto de 2026. Fuente: esquema remoto de PocketBase leído con permisos de superusuario, sin inspeccionar registros ni valores de credenciales.

## Estado vigente que la migración debe preservar

| Colección | Campos de dominio existentes | Reglas vigentes relevantes |
| --- | --- | --- |
| `courses` | `title`, `description`, `startDate`, `endDate`, `status`, `students`, `teachers`, `classes`, `assignments`, `enrollmentKeyHash` oculto | Lectura pública; creación y eliminación de administrador; actualización de administrador o docente. |
| `classes` | `title`, `description`, `date`, `course` | Lectura autenticada; escritura de docente o administrador. |
| `assignments` | `title`, `description`, `systemPrompt`, `course`, `dueDate` | Lectura autenticada; escritura de docente o administrador. |
| `inquiries` | `title`, `description`, `status`, `author`, `class`, `assignment`, `inquiries`, `course` | Lectura y creación autenticadas; actualización de autor, docente o administrador; eliminación de administrador. |

La migración MUST anexar campos sin reconstruir colecciones ni reemplazar sus campos de sistema. También MUST conservar índices, opciones select, relaciones, reglas no relacionadas y valores existentes.

## Diferencias requeridas

- `courses`: añadir `organizationMode` con opciones `tradicional` y `semanal`, usando `tradicional` cuando el registro no posea valor.
- `course_weeks`: crear la colección con curso, número, título, fechas opcionales, estado y fecha de publicación; imponer unicidad de `(course, number)`.
- `classes`, `assignments` e `inquiries`: añadir una relación singular y opcional `week`, sin eliminación en cascada del contenido.
- Reglas: limitar la gestión de semanas a docentes asignados, permitir lectura administrativa y proteger la lectura estudiantil según matrícula y visibilidad efectiva.
- `courses.updateRule`: impedir que una actualización docente modifique `organizationMode`; las acciones del servidor seguirán validando además el alcance del curso.

## Compatibilidad y verificación

- La migración no asignará semanas a contenido existente ni generará semanas automáticamente.
- Los cursos existentes seguirán comportándose como tradicionales.
- Se compararán antes y después los conteos de cursos, clases, trabajos y consultas.
- Una segunda ejecución deberá producir el mismo esquema sin duplicar campos, colecciones ni índices.
