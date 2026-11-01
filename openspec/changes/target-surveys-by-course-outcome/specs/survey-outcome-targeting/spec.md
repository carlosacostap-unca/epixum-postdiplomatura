## Purpose

Ofrecer cuestionarios diferentes a los alumnos según el resultado final publicado de su cursada, manteniendo el alcance por curso y la privacidad de sus respuestas.

## ADDED Requirements

### Requirement: Destinatarios configurables por encuesta
El docente asignado o administrador MUST poder elegir todos los alumnos, Aprobado o el grupo conjunto No aprobado/No completó mientras la encuesta sea borrador. El destinatario MUST quedar fijo al publicar y MUST conservarse al duplicar. Las encuestas existentes sin configuración MUST conservar el comportamiento para todos los matriculados.

#### Scenario: Edición de destinatarios
- **WHEN** un docente guarda un borrador para No aprobado/No completó
- **THEN** la encuesta conserva ese grupo y su copia hereda la misma selección

#### Scenario: Compatibilidad anterior
- **WHEN** se consulta una encuesta sin destinatario configurado
- **THEN** mantiene el acceso para todos los alumnos matriculados según los permisos existentes

### Requirement: Acceso según resultado publicado
La selección de encuestas segmentadas MUST usar exclusivamente el estado publicado del alumno en el mismo curso. La comprobación MUST aplicarse al listar, abrir y responder, incluyendo solicitudes directas. Los borradores de resultados, notas y autodeclaraciones MUST NOT determinar el grupo. Sin resultado publicado o con resultados de cursada deshabilitados, el alumno MUST NOT acceder a encuestas segmentadas. Un valor de destinatario desconocido MUST NOT ampliar permisos.

#### Scenario: Alumno aprobado
- **WHEN** el alumno tiene Aprobado publicado y las funciones están habilitadas
- **THEN** puede acceder a encuestas de aprobados y generales, y no a las del grupo No aprobado/No completó

#### Scenario: Grupo conjunto
- **WHEN** el alumno tiene No aprobado o No completó publicado
- **THEN** puede acceder a la encuesta del grupo conjunto y no a la de aprobados

#### Scenario: Resultado pendiente o retirado
- **WHEN** solo existe un borrador o se retiró la publicación del resultado
- **THEN** las encuestas segmentadas no se listan ni admiten apertura o respuesta

#### Scenario: Corrección pendiente
- **WHEN** el docente guarda una corrección del resultado sin publicarla
- **THEN** la asignación de encuestas sigue usando el resultado publicado anterior

### Requirement: Conservación y privacidad
La segmentación MUST conservar la unicidad por encuesta y alumno, el anonimato configurado y las respuestas anteriores si cambia el resultado publicado. La aplicación MUST volver a comprobar la elegibilidad al enviar. Los alumnos MUST NOT recibir listados de integrantes de otros grupos ni datos de sus resultados.

#### Scenario: Cambio de grupo publicado
- **WHEN** cambia el resultado publicado de un alumno
- **THEN** se actualizan sus accesos según el grupo vigente y se conservan sus respuestas anteriores sin reasignarlas

### Requirement: Preparación de encuestas de Pensamiento Crítico
El sistema MUST permitir preparar dos borradores revisables para el curso activo de Pensamiento Crítico: uno para Aprobado y otro para No aprobado/No completó, con preguntas comunes y específicas. La preparación MUST NOT publicar encuestas ni crear o modificar resultados académicos.

#### Scenario: Borradores preparados
- **WHEN** se preparan ambos cuestionarios
- **THEN** quedan como borradores anónimos en el curso indicado, sin alterar la otra cohorte ni los resultados de los alumnos
