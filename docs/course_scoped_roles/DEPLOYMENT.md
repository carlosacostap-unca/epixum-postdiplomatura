# Despliegue seguro de roles por curso

## Requisitos previos

1. Crear un respaldo completo y recuperable de PocketBase mediante el mecanismo operativo del servidor. El reporte sanitizado del repositorio no sustituye ese respaldo.
2. Ejecutar `npm run schema:course-roles:audit` en modo de solo lectura.
3. No continuar si `compatible` es `false`, si existen relaciones inválidas o si una persona aparece como docente y estudiante del mismo curso.
4. Conservar el reporte previo fuera de cualquier ubicación pública. No guardar tokens, emails, claves, contraseñas ni hashes secretos.

## Estado de ejecución (2026-09-03)

- Auditoría remota de solo lectura: compatible.
- Registros relevados: 311 usuarios, 9 cursos, 17 asignaciones docentes, 463 matrículas y 148 invitaciones.
- Conflictos o relaciones inválidas detectadas: 0.
- Validación local: 183 pruebas de aplicación aprobadas (2 omitidas), 24 pruebas de esquema aprobadas, TypeScript, ESLint y build de producción aprobados.
- Respaldo automático verificado: `@auto_pb_backup_epixum_postdiplomatura_20260903000000.zip`.
- Respaldo manual inmediatamente anterior al cambio verificado: `course_roles_pre_20260903_1234.zip` (8.692.002 bytes, 2026-09-03 12:34:49 UTC).
- Evidencia sanitizada previa guardada localmente en `backups/pocketbase/course-role-pre-20260903.json` (ubicación ignorada por Git).
- Migración remota aplicada sobre 14 colecciones: sólo se actualizaron reglas de autorización.
- Matriz remota superada para administrador, docente asignado y ajeno, estudiante matriculado y ajeno, cuenta mixta y cliente anónimo; los fixtures fueron eliminados.
- Auditoría posterior guardada en `backups/pocketbase/course-role-post-20260903.json`: `comparison.equal` es `true`, sin diferencias respecto de usuarios, cursos, asignaciones docentes ni matrículas previas.
- Aplicación publicada desde `main` con el commit `937ab5c`; el funcionamiento en el entorno publicado fue confirmado por el usuario el 2026-09-03.
- Los recorridos funcionales de administración, docencia, estudio, matrícula y cambio de espacio quedaron conformes, complementando la matriz remota con datos sintéticos ya superada.

La actualización remota fue autorizada explícitamente después de verificar ambos respaldos. Las reglas y la aplicación quedaron publicadas y verificadas sin cambios en las participaciones preexistentes.

## Orden de despliegue

1. Ejecutar las pruebas locales de reglas y la suite de aplicación.
2. Aplicar la migración idempotente de reglas, que no elimina ni recrea registros o colecciones.
3. Desplegar la aplicación con autorización contextual y selector de espacios.
4. Ejecutar la matriz de acceso con fixtures sintéticos y confirmar su limpieza.
5. Ejecutar nuevamente la auditoría usando `--compare <reporte-previo>` y exigir `comparison.equal: true`.

## Criterios de aborto

- Conflicto docente-estudiante dentro del mismo curso.
- Matrícula duplicada o relación hacia un usuario, curso o invitación inexistente.
- Estudiante heredado en `courses.students` sin matrícula equivalente.
- Diferencias inesperadas en IDs, asignaciones docentes o matrículas entre los reportes previo y posterior.

La herramienta termina con código 2 ante incompatibilidad o comparación desigual. Ningún conflicto se resuelve eliminando o reasignando datos automáticamente.

## Rollback

Ante una regresión se vuelve a la versión anterior de la aplicación y de las reglas. Como la migración no modifica participaciones ni elimina estructuras, el rollback normal no restaura datos. El respaldo completo se utiliza únicamente si la verificación demuestra una mutación inesperada de registros.
