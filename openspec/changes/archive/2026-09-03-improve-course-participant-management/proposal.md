## Why

La administración de participantes de un curso está hoy fragmentada entre un selector múltiple de docentes dentro del formulario general y la gestión indirecta de alumnos mediante claves o invitaciones. Los administradores necesitan una superficie clara y segura para consultar, buscar, incorporar y retirar alumnos o docentes sin perder actividad histórica ni crear roles incompatibles dentro del mismo curso.

## What Changes

- Incorporar una sección administrativa de Participantes dentro de cada curso, con pestañas para alumnos, docentes e invitaciones, conteos, búsqueda, estados vacíos y presentación responsive.
- Permitir que un administrador matricule directamente en un curso a una o varias cuentas existentes, sin exigirles la clave o contraseña, manteniendo la exclusividad docente-estudiante del mismo curso.
- Reemplazar el selector múltiple nativo de docentes por un diálogo accesible con búsqueda, selección explícita y explicación de candidatos incompatibles.
- Permitir retirar una asignación docente o una matrícula mediante confirmación contextual, sin borrar entregas, consultas, evaluaciones ni otros registros históricos de la persona.
- Separar la configuración general, los participantes y el acceso del curso en destinos administrativos claros, conservando las URLs y componentes existentes cuando resulte posible.
- Mantener las invitaciones para identidades que todavía no poseen cuenta y comunicar que Epixum no envía emails.
- Releer la participación después de cada mutación, revalidar todas las superficies afectadas y ofrecer mensajes específicos de éxito, conflicto o cambio concurrente.
- Añadir pruebas de autorización, exclusividad, conservación histórica, búsqueda, teclado, foco, diálogo, confirmación y experiencia móvil.

## Capabilities

### New Capabilities

- `course-participant-management`: Define la experiencia administrativa por curso para listar, buscar, agregar y retirar alumnos, docentes e invitaciones con confirmaciones y estados accesibles.

### Modified Capabilities

- `course-management-and-enrollment`: Permite matrícula administrativa directa de cuentas existentes y retiro explícito de participaciones sin eliminación de actividad histórica.
- `application-shell-and-navigation`: Añade navegación contextual administrativa entre configuración, participantes y acceso dentro de un curso.
- `pocketbase-data-and-security`: Extiende la defensa en profundidad y las reglas de matrículas para las mutaciones administrativas de participantes, preservando el resto de los datos.

## Impact

- Afecta las páginas administrativas de creación y edición de cursos, el formulario de curso y los componentes de claves e invitaciones.
- Añade una ruta o superficie de participantes por curso, un selector accesible de personas y acciones de servidor exclusivas para administradores.
- Afecta las lecturas paginadas de usuarios, docentes, matrículas e invitaciones y la revalidación de áreas administrativas, docentes y estudiantiles.
- Puede requerir ajustes no destructivos en las reglas de `courses` y `course_enrollments`; no añade una nueva fuente de verdad ni reemplaza `courses.teachers` o `course_enrollments`.
- Eliminar una participación sólo retira acceso futuro al curso. Los usuarios, cursos, invitaciones, entregas, consultas, respuestas, evaluaciones y archivos existentes permanecen intactos.
- No incorpora envío de emails, conversión automática entre alumno y docente, eliminación masiva ni dependencias externas nuevas.
