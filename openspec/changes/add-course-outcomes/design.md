## Context

El proyecto ya tiene configuración administrativa opcional por curso, docentes contextuales y un resumen estudiantil. course_enrollments determina las matrículas vigentes y el servicio de PocketBase permite transacciones. Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals:** Publicación individual con mínima exposición de datos, borradores independientes de la versión visible, auditoría y protección de concurrencia.

**Non-Goals:** Cálculo automático, aprobación por nota, certificados, correo, estados personalizables o publicación masiva.

## Decisions

- courses.outcomesEnabled, deshabilitado por defecto y protegido en la regla compartida de actualización de cursos.
- course_outcomes privada: relación curso/alumno (índice único), draft JSON validado, published JSON opcional y revisión aleatoria. El JSON conserva null para nota ausente y permite nota cero. Estado independiente de la nota. Nota de 0 a 10 con hasta dos decimales, devolución de hasta 5000 caracteres.
- course_outcome_history privada: relación al resultado, revisión consumida (única por resultado), acción, actor y nombre de autor al momento de la operación, fecha y snapshots del borrador y publicación. Cada mutación confirma resultado e historial en el mismo lote; las revisiones consumidas impiden actualizaciones perdidas entre procesos.
- Datos ligados a curso y usuario, sin relación a la matrícula: retirar matrículas no elimina resultados. La gestión habitual requiere matrícula vigente; una futura reinscripción recupera el mismo resultado conservado. Deshabilitar solo bloquea accesos.
- Guardar modifica solo el borrador; publicar copia el borrador validado al snapshot visible y registra la fecha. Retirar publicación limpia solo ese snapshot. Publicación bloqueada en interfaz con cambios sin guardar y protegida por revisión en servidor.
- El servidor valida autenticación, habilitación, pertenencia docente o administración, alumno matriculado y ausencia de conflicto de rol antes de usar el servicio. Colecciones bloqueadas también para clientes normales de administración. La consulta estudiantil no recibe studentId: lo deriva de la sesión y proyecta exclusivamente el snapshot publicado.
- Gestión docente/administrativa mediante listado y detalle por alumno, con enlaces desde la ficha de seguimiento. Resumen estudiantil con tarjeta propia; sin ruta ni tabla estudiantil de resultados del grupo.
- Historial paginado y lista de matrículas paginada, con búsqueda por nombre o email y proyecciones de campos. Acciones sin logs de contenido; se conserva logging.serverFunctions=false.

## Risks / Trade-offs

- Ediciones simultáneas → revisión esperada y auditoría transaccional; mostrar conflicto y recargar antes de reintentar.
- Retiro de matrícula o cambio de asignación durante una operación → comprobar permisos en cada solicitud y nuevamente antes del lote.
- Correcciones que se confundan con publicaciones → mostrar versión visible separada del borrador y confirmar publicación/retiro.
- Eliminación de cuentas → relaciones sin cascada hacia usuario; el autor queda además registrado por nombre en el historial. Eliminar un curso conserva la semántica existente de eliminación de sus datos asociados.

## Migration Plan

Crear campo y colecciones mediante script idempotente con respaldo previo, comprobar salud y lotes de al menos dos operaciones. Preservar reglas ajenas, matrículas y valores de habilitación existentes. Aplicar esquema antes de desplegar. Para retirar la función, deshabilitarla conservando datos.
