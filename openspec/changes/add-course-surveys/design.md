## Context

El formulario administrativo ya activa módulos por curso y las asignaciones docentes son contextuales. La matrícula vigente reside en course_enrollments. El servidor dispone de un cliente de servicio y PocketBase admite lotes transaccionales; el onboarding usa colecciones privadas.

## Goals / Non-Goals

**Goals:** Reutilizar permisos y componentes existentes, validar entradas en servidor y proteger la privacidad y unicidad ante concurrencia.

**Non-Goals:** Preguntas condicionales, correo, calificaciones, edición de respuestas enviadas y plantillas globales.

## Decisions

- Campo courses.surveysEnabled administrado exclusivamente por admin, protegido también en la regla de actualización de cursos.
- Colecciones privadas course_surveys (diseño, estado, modalidad, fecha de cierre), course_survey_participations (encuesta, alumno) y course_survey_responses (encuesta, respuestas, alumno solamente si identificada). Índice único de participación por encuesta/alumno. Sin enlace de participación a respuesta; los registros anónimos carecen de alumno y fechas automáticas.
- Todas las lecturas/escrituras pasan por servidor que comprueba sesión, habilitación y alcance antes de usar el servicio. No se devuelven registros privados completos al cliente.
- Envío de participación y respuesta en un único batch transaccional. El índice único arbitra envíos simultáneos; los reintentos confirman la participación existente. No se registra contenido ni identidad en logs.
- Diseño inmutable desde publicación, incluso sin respuestas, para evitar incompatibilidades entre formularios abiertos y cambios docentes. Duplicar permite modificarlo sin alterar el historial.
- Control optimista para las mutaciones de diseño y ciclo de vida mediante revisiones consumidas con índice único en el mismo batch. La publicación crea un registro privado de apertura; las respuestas incluyen una relación a esa apertura, que se valida dentro de su transacción. Cerrar elimina la apertura sin eliminar respuestas históricas (relación opcional sin cascada) y bloquea envíos en vuelo que apunten al registro eliminado. Distintos alumnos no compiten por una revisión compartida. Los reintentos de un mismo alumno se arbitran mediante el índice único de participación.
- Resultados anónimos solo agregados y textos agrupados por pregunta, ordenados por contenido; sin filas completas, nombres, IDs ni tiempos que permitan correlacionar respuestas entre preguntas. Las respuestas abiertas pueden contener datos escritos voluntariamente por los alumnos; la interfaz pide evitar identificarse. La infraestructura de base de datos sigue bajo control operativo de sus administradores.
- Fechas enviadas como ISO desde la zona horaria local del navegador y comparadas en servidor. Sin cron: el vencimiento se calcula al consultar y al enviar.
- Desactivar logging.serverFunctions en Next.js: esta versión registra argumentos de las acciones por defecto en desarrollo, lo que expondría respuestas en la terminal.

## Risks / Trade-offs

- Envíos y cierre simultáneos → relación transaccional a la apertura vigente, sin bloqueo global entre alumnos; probar que la eliminación invalida referencias obsoletas y conserva respuestas anteriores.
- Retiro de matrícula o deshabilitación durante una solicitud → revalidar acceso justo antes de la escritura; permisos vigentes se comprueban en cada solicitud.
- Identificación por texto libre o grupos pequeños → aviso claro de privacidad; no prometer anonimato frente a inferencias o acceso operativo a infraestructura.
- Fallo parcial de envío → transacción de participación/respuesta/revisión; nunca escrituras compensatorias.

## Migration Plan

Script aditivo e idempotente con respaldo de esquemas, nuevas colecciones privadas, campo booleano y regla de cursos actualizada. Verificar batch habilitado, preservar valores y datos existentes. Aplicar esquema antes de desplegar. Para revertir operativamente, deshabilitar encuestas y restaurar código; conservar colecciones y datos.
