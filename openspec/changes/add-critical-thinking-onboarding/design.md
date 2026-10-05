## Context

Ver proposal.md. Existen 201 invitaciones y perfiles precargados; Google identifica cuentas por email. El curso tiene resumen estudiantil y pestañas de administración/docencia.

## Goals / Non-Goals

**Goals:** persistir progreso por alumno/curso, proteger respuestas y conservar la encuesta como línea de base.
**Non-Goals:** matriculación automática, bloqueo de materiales, envío de emails, cursos introductorios o cambios automáticos de identidad.

## Decisions

- Campo courses.onboardingEnabled administrable; inicialmente se activa solo el curso solicitado. Evita acoplar pantallas a un ID de producción.
- Colección course_onboarding con índice único (course, student), timestamps independientes, surveyDraft JSON acotado, emailChangeRequested y versión de requisitos. Encuesta enviada en course_onboarding_surveys con igual índice único, respuestas y versión, sin actualizaciones.
- Todas las escrituras pasan por acciones servidor con identidad de sesión, validación y control de alcance. PocketBase deniega lecturas y escrituras directas; los servicios servidor devuelven únicamente el progreso propio o las respuestas enviadas del curso al docente asignado o admin. El cliente privilegiado se crea después de autorizar.
- Perfil editable hasta su confirmación; tras confirmar se corrige desde el perfil habitual. Email autenticado de solo lectura con solicitud de corrección para administración. No se duplican datos personales en snapshots de onboarding.
- Borradores de encuesta explícitos con botón Guardar borrador. El envío crea un registro inmutable con índice único para evitar reemplazo de la línea de base y proteger contra pestañas simultáneas.
- Componentes compartidos para mensaje permanente y etapa tres; resumen enlaza onboarding y conserva indicaciones. Enlace desde invitaciones permite comenzar sin contraseña del curso. La finalización no sustituye la activación.
- Reporte compartido para admin/docente con respuestas enviadas, contadores y participantes invitados/matriculados, sin revelar borradores.

## Risks / Trade-offs

- Fallo parcial al confirmar perfil → guardar primero perfil y luego confirmación; reintento seguro, sin marcar completado antes de persistir.
- Solicitud de cambio de email → requiere revisión administrativa posterior; mensaje explícito al alumno.
- Otros cursos → indicador desactivado por defecto, sin cambios de navegación.
- Concurrencia → índices únicos, encuestas inmutables y relectura; no sobrescribir encuestas ya enviadas.

## Migration Plan

Respaldar esquema e inventario; aplicar migración idempotente, verificar permisos con usuarios temporales y habilitar solo el curso solicitado. Desplegar con el flujo existente cuando corresponda. Rollback: desactivar onboardingEnabled y conservar colección y respuestas.
