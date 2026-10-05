# Asistencia en clases interactivas

## Uso

En un curso con **Clases interactivas** habilitadas, abrir la pestaña **Asistencia**. Tanto un administrador como un docente asignado pueden activar el seguimiento. Inicialmente está desactivado.

- Administración: `/admin/courses/[id]/asistencia`.
- Docencia: `/docentes/cursos/[id]/asistencia`.

La configuración se aplica a sesiones que se inicien después del cambio. Las sesiones ya iniciadas conservan su configuración. Desactivar y volver a activar no borra el historial ni imputa ausencias en sesiones anteriores.

El alumno debe estar matriculado e ingresar con su cuenta y el código/enlace de la sesión mientras está **en vivo**. Ese ingreso registra el presente con fecha servidor. Reingresar no duplica el presente ni reemplaza la primera hora. Abrir el repaso o simular un material no cuenta.

## Planilla y correcciones

La planilla muestra alumnos en filas y clases vinculadas a materiales interactivos en columnas. Se puede buscar por nombre/email, filtrar por clase y usar **Actualizar planilla** para ver los últimos ingresos. En móvil, la tabla se desplaza horizontalmente. Los horarios se muestran en la zona de Argentina.

Los únicos resultados de asistencia son **Presente** y **Ausente**. Una clase futura o todavía abierta aparece pendiente para quien no ingresó. Al finalizar todas sus sesiones con seguimiento, los matriculados aplicables sin ingreso figuran ausentes. Varias sesiones de la misma clase se consolidan en una única columna y basta un ingreso con seguimiento para presente.

**Sin registro** indica sesiones realizadas sin seguimiento. **No corresponde** indica que no existe una matrícula aplicable a la clase; no se contabiliza como ausencia. Las nuevas matrículas tienen fecha automática para evitar ausencias retroactivas. Las matrículas anteriores a esta implementación que no tenían fecha se consideran preexistentes, sin inventar una fecha histórica.

**Corregir** permite elegir Presente o Ausente. Se guarda quién hizo la corrección y cuándo. La última corrección siempre prevalece, incluso si el alumno se reconecta. El formulario permite consultar el historial completo. Las correcciones siguen disponibles en clases registradas aunque el seguimiento de nuevas sesiones esté desactivado.

La nómina parte de las matrículas vigentes y conserva alumnos con ingresos o correcciones registrados. No es un archivo histórico de matrículas eliminadas sin participación. Las invitaciones sin matrícula no generan ausencias.

## Persistencia y permisos

- `courses.attendanceEnabled`: configuración para sesiones nuevas. Las acciones autorizan administrador o docente asignado; docentes ajenos y alumnos no pueden modificarla.
- `interactive_sessions.attendanceEnabled`: copia inmutable al iniciar, validada por las reglas de PocketBase contra el curso.
- `interactive_participants.created`: evidencia de ingreso durante live; única por sesión/alumno. PocketBase impide ingresos después del cierre y cambios de fecha/identidad.
- `course_attendance_adjustments`: eventos privados de corrección, con curso/clase/alumno, estado, autor y fecha. Todas las reglas de acceso directo son `null`. El servicio servidor verifica alcance antes de acceder.
- `course_enrollments.created`: fecha automática para matrículas nuevas, preservando las anteriores.

## Migración y verificación

```powershell
npm.cmd run schema:attendance:test
npm.cmd run schema:attendance
```

Requiere esquema de clases interactivas existente. Respalda esquema e inventario en `backups/pocketbase/`, preserva campos e índices y no habilita cursos. Aplicar antes de desplegar la aplicación. Para rollback operativo, desactivar asistencia de nuevas sesiones; conservar las colecciones y el historial.

Pruebas locales: `lib/course-attendance.test.ts`, `lib/actions-course-attendance.test.ts`, `components/attendance/AttendanceSheet.test.tsx` y `scripts/attendance-schema.test.mjs`. La integración real está desactivada por defecto:

```powershell
$env:ATTENDANCE_INTEGRATION='1'
npx.cmd vitest run lib/course-attendance.integration.test.ts
```

La integración crea y elimina sus propios cursos/usuarios. Para revisión visual, `node scripts/attendance-browser-fixture.mjs create` prepara sesiones de navegador temporales en una carpeta ignorada. El comando `cleanup` elimina registros y credenciales. No compartir esos archivos.

## Verificación de implementación

Verificado el 5 de octubre de 2026: pruebas de asistencia y regresiones de clases interactivas/configuración, 41 pruebas de esquemas existentes, migración específica, tipos, lint y build de producción aprobados. Integraciones reales de asistencia y clases en vivo aprobadas. Recorrido en navegador: activación docente, ingreso estudiantil, cierre con presente/ausente, corrección docente y administrativa, historial y vista móvil sin desbordamiento de página.

Esquema aplicado con respaldo e inventario conservado. La función queda desactivada en cursos reales; el código necesita publicación y despliegue para estar disponible en el campus.
