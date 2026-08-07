# Resultado del despliegue de doble validación

Fecha: 7 de agosto de 2026.

## Resultado

La migración `schema:invitation` se aplicó dos veces sobre PocketBase remoto. Ambas ejecuciones finalizaron correctamente, no reinicializaron cursos ya configurados y confirmaron la idempotencia del cambio.

La prueba real `schema:invitation:verify` finalizó con `runId` `476f4707`, 24 controles aprobados y limpieza completa. Se verificaron administrador, docente asignado, docente ajeno, estudiante invitado y estudiante no invitado; rotación de contraseña; activación por invitación; matrícula tradicional por clave; acceso a contenido; conservación de acceso al cambiar la modalidad y rechazo de altas directas desde clientes regulares.

Las ejecuciones diagnósticas anteriores (`2732dcd7` y `7809c6ca`) también informaron limpieza completa. No quedaron fixtures de prueba.

## Comparación de datos existentes

| Colección | Antes | Después | IDs conservados |
|---|---:|---:|---|
| `users` | 61 | 61 | Sí |
| `courses` | 7 | 7 | Sí |
| `course_enrollments` | 174 | 174 | Sí |
| `course_weeks` | 1 | 1 | Sí |
| `classes` | 18 | 18 | Sí |
| `assignments` | 5 | 5 | Sí |
| `inquiries` | 7 | 7 | Sí |

Después de la limpieza, `course_enrollment_invitations` y `course_enrollment_attempts` contienen cero registros. Los siete cursos existentes quedaron en modalidad `clave`; seis conservan organización tradicional y uno semanal.

## Respaldos

- Previo: `backups/pocketbase/2026-08-07T13-38-11-222Z-pre-migration.json`.
- Posterior: `backups/pocketbase/2026-08-07T14-13-00-013Z-post-verification.json`.

Los respaldos contienen esquema sanitizado, conteos y digest de IDs; no incluyen registros, contraseñas, HMAC ni credenciales administrativas.

## Hallazgo y endurecimiento aplicado

PocketBase descarta escrituras y filtros de campos `hidden` realizados por usuarios regulares. Por lo tanto, las reglas se endurecieron para bloquear toda creación directa de `course_enrollments`, y las Server Actions usan un cliente de servicio confinado al servidor solamente después de validar sesión, rol, alcance, modalidad, identidad y credencial. Las respuestas al navegador no exponen hashes ni el secreto HMAC.

## Rollback disponible

Ante una regresión funcional, se pueden mantener o devolver los cursos afectados a modalidad `clave` y desplegar una versión anterior de la interfaz. Las colecciones y campos nuevos deben conservarse para evitar pérdida de trazabilidad. El snapshot previo permite comparar o reconstruir el esquema, pero no se debe restaurar la antigua regla de creación directa de matrículas, porque quedó comprobado que no protege los campos ocultos. Cualquier reversión de esquema debe hacerse de forma explícita, respaldada y sin eliminar colecciones ni registros.
