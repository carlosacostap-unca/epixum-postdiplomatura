# Cursos en borrador y estudiantes invitados

Los cursos en borrador son visibles para administradores, docentes asignados al curso y cuentas incluidas explícitamente en `courses.guestStudents`. El rol global docente no da acceso a cursos ajenos. Los invitados mantienen una matrícula en `course_enrollments` y su rol global original.

En Administración → Cursos → Participantes → Alumnos, el formulario **Estudiantes invitados** permite incorporar una cuenta por correo o conceder el permiso a un alumno existente. No envía un email. **Quitar permiso de invitado** conserva la matrícula; **Retirar** quita ambas participaciones y conserva la actividad histórica.

La restricción vive en PocketBase, no solo en la interfaz: listados, enlaces directos, expansiones y colecciones relacionadas conservan sus permisos previos y agregan la condición de visibilidad del curso. La publicación individual de clases, recursos y actividades sigue siendo independiente. Los registros restringidos al servidor mantienen reglas nulas.

## Instalación y mantenimiento

Ejecutar `node scripts/setup-course-draft-schema.mjs` con la configuración administrativa habitual. Es idempotente. En instalaciones nuevas debe ejecutarse antes de migraciones que usen `COURSE_RULES`, para crear `guestStudents`, y otra vez al final de cualquier actualización de reglas de módulos: esas migraciones pueden reemplazar reglas de colecciones hijas. No cambia estados ni matrículas.

Verificar con `node --test scripts/course-draft-schema.test.mjs` y `node scripts/verify-course-draft-access.mjs <courseId>`. La segunda comprobación usa sesiones breves de identidades existentes, realiza solo lecturas y no imprime tokens ni datos personales.

## Aplicación del 8 de noviembre de 2026

Se aplicaron las reglas en PocketBase y se puso en borrador la cohorte 2 (`5wdbs1o1p22vszm`). Se agregó la cuenta solicitada como invitada y matriculada. Se verificó que invitado y docente asignado acceden a las ocho clases, mientras que un estudiante común no ve el curso ni sus clases y recibe 404 por enlace directo.

Los cambios de interfaz y la habilitación de la aventura para invitados a borradores requieren publicar esta versión de la aplicación. El estado del curso y las reglas de PocketBase ya están aplicados.
