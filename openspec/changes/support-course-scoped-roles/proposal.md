## Why

Epixum asigna hoy un único rol global a cada cuenta, lo que impide que una misma persona enseñe en un curso y estudie en otro aunque las relaciones de cursos y matrículas ya representen ambos vínculos. El producto necesita reconocer roles por curso sin perder docentes, estudiantes, matrículas ni actividad existente.

## What Changes

- Definir `admin` como privilegio global y determinar los roles `docente` y `estudiante` por la relación concreta de la persona con cada curso.
- Permitir que una persona sea docente en uno o más cursos y estudiante en otros, manteniendo acceso simultáneo a las áreas de docencia y estudio.
- Impedir que una misma persona sea docente y estudiante dentro del mismo curso, tanto al asignar docentes como al crear matrículas.
- Adaptar el ingreso, la página raíz y el shell para ofrecer los espacios autorizados cuando una persona tenga más de un contexto.
- Sustituir las comprobaciones globales de `user.role` en rutas, Server Actions y reglas de PocketBase por verificaciones de administración, asignación docente o matrícula según la operación.
- Conservar `courses.teachers`, `course_enrollments`, sus IDs y todas las relaciones existentes como fuentes de verdad; el campo global `users.role` se mantiene durante la transición y no se reescribe destructivamente.
- Incorporar una auditoría previa, migración idempotente de reglas, comparación antes/después y rollback sin eliminación de colecciones ni registros.
- Actualizar la administración de usuarios y cursos para mostrar privilegios globales y participaciones contextuales sin presentar `docente` y `estudiante` como opciones mutuamente excluyentes de toda la plataforma.

## Capabilities

### New Capabilities

- `course-scoped-roles`: Define la resolución de roles por curso, la coexistencia entre docencia y estudio en cursos diferentes, la exclusividad dentro del mismo curso y la compatibilidad con relaciones existentes.

### Modified Capabilities

- `authentication-and-access`: El acceso deja de seleccionar un único portal por rol global y habilita todas las áreas respaldadas por privilegios o relaciones vigentes.
- `application-shell-and-navigation`: La navegación permite cambiar entre administración, docencia y estudio según los contextos disponibles para la cuenta.
- `course-management-and-enrollment`: La asignación docente y la matrícula validan exclusividad por curso sin exigir un rol global mutuamente excluyente.
- `user-management-and-profile`: La administración separa el privilegio global de administrador de las participaciones docentes y estudiantiles por curso.
- `pocketbase-data-and-security`: Las reglas y migraciones autorizan por relaciones contextuales, preservan los datos existentes y verifican la ausencia de conflictos por curso.

## Impact

- Afecta el intercambio OAuth, la resolución de la ruta raíz, los layouts y el shell de `app/admin`, `app/docentes` y `app/estudiantes`.
- Afecta las comprobaciones de autorización en Server Actions, páginas de curso, utilidades de alcance y reglas PocketBase de cursos, matrículas, semanas, contenidos, recursos, trabajos, entregas, consultas y preevaluaciones.
- Afecta la selección administrativa de docentes y la gestión de usuarios, que deberán representar afiliaciones por curso además del privilegio administrativo.
- No elimina ni reemplaza inicialmente `courses.teachers`, `course_enrollments` ni `users.role`; conserva IDs, fechas y referencias de cursos, usuarios, invitaciones, entregas, consultas y evaluaciones.
- Requiere respaldo recuperable, auditoría en modo lectura, migración idempotente, verificación de igualdad antes/después y una matriz de acceso que cubra usuarios con roles distintos entre cursos.
- No incorpora dependencias externas nuevas ni modifica el mecanismo Google OAuth, la cookie de sesión, S3 u OpenAI.
