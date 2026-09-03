# Administración de participantes por curso

## Mapa de implementación

| Área actual | Decisión | Destino |
| --- | --- | --- |
| `app/admin/courses/[id]/page.tsx` | Conservar la edición general y separarla del acceso | Configuración del curso |
| `components/CourseForm.tsx` | Retirar el selector múltiple de docentes y las credenciales | Formulario de configuración |
| `components/CourseInvitationManager.tsx` | Reutilizar con enlaces propios de filtros y páginas | Acceso e invitaciones |
| `components/CourseKeyManager.tsx` | Reutilizar sin cambiar la semántica de claves | Acceso |
| `courses.teachers` | Mantener como fuente de verdad | Lecturas y acciones de docentes |
| `course_enrollments` | Mantener como fuente de verdad | Lecturas y acciones de alumnos |
| `scripts/course-role-audit.mjs` | Extender sin escrituras | Control previo y posterior |

Las rutas nuevas viven bajo `/admin/courses/[id]` y comparten un encabezado con Configuración, Participantes y Acceso. Las Server Actions son entradas no confiables: todas vuelven a autenticar, exigen rol `admin`, validan los identificadores contra PocketBase y verifican la escritura antes de informar éxito.

## Integridad y datos existentes

La implementación no copia ni transforma docentes, matrículas o invitaciones. Retirar un alumno elimina solamente su registro de `course_enrollments`; retirar un docente modifica solamente `courses.teachers`. La auditoría comprueba duplicados, conflictos de participación, referencias ausentes, cascadas hacia matrículas y la identidad de los registros históricos.

El snapshot de esquema vigente mantiene `course_enrollments.createRule = null`; por lo tanto, ni siquiera una cuenta administradora puede crear matrículas como cliente regular. Las altas administrativas pasan por la Server Action validada y por el cliente de servicio. El alta múltiple utiliza la API transaccional de PocketBase: habilitarla no cambia las reglas de acceso, y cada operación interna continúa evaluando las reglas correspondientes. No se requiere modificar reglas ni ejecutar una migración de registros para este cambio.

## Despliegue y rollback

1. Ejecutar las pruebas unitarias, de componentes y esquema.
2. Generar un snapshot previo con `npm run schema:course-roles:audit -- --output <archivo>`.
3. Consultar `npm run schema:course-participants:batch -- status` y habilitar las operaciones transaccionales con `npm run schema:course-participants:batch -- apply <snapshot-config>`. El comando conserva la configuración anterior para un rollback exacto.
4. Desplegar la aplicación. No ejecutar una migración de registros.
5. Ejecutar la verificación real de acceso y generar un segundo snapshot con `--compare <archivo-previo>`.
6. Confirmar conteos de docentes, matrículas e historial antes de habilitar el flujo a administradores.

Para revertir, se restaura la versión anterior de la aplicación y se ejecuta `npm run schema:course-participants:batch -- rollback <snapshot-config>`. Como no hay migración ni nueva fuente de verdad, no existe rollback de datos. Si una verificación detecta cascadas destructivas, el despliegue debe detenerse antes de habilitar retiros.
