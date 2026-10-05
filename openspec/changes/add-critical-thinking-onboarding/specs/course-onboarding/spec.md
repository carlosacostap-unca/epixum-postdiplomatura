## Purpose

Permitir que los alumnos confirmen su información, compartan su experiencia inicial con IA y comprendan la preparación necesaria para participar de las prácticas en vivo.

## ADDED Requirements

### Requirement: Acceso por curso y progreso privado
El sistema MUST ofrecer tres etapas secuenciales y reanudables solo en cursos habilitados, a alumnos matriculados o con invitación pendiente válida para su email. MUST NOT activar matrículas ni permitir consultar o modificar el progreso de otro alumno.

#### Scenario: Invitado retoma el proceso
- **WHEN** un invitado válido guarda una etapa y vuelve a ingresar
- **THEN** continúa desde la siguiente etapa pendiente conservando sus respuestas guardadas.

#### Scenario: Acceso ajeno
- **WHEN** un usuario sin matrícula ni invitación válida intenta guardar respuestas
- **THEN** se rechaza la operación sin modificar datos.

### Requirement: Confirmación de datos personales
El sistema MUST mostrar y permitir corregir nombres, apellidos, DNI, nacimiento y teléfono, conservando mayúscula inicial por palabra. MUST mostrar el email autenticado y permitir solicitar su corrección sin cambiar automáticamente credenciales ni invitaciones.

#### Scenario: Datos confirmados
- **WHEN** el alumno confirma datos válidos
- **THEN** se actualiza únicamente su perfil y se registra la fecha de confirmación.

#### Scenario: Fecha inválida
- **WHEN** se ingresa una fecha imposible o futura
- **THEN** se indica el error y no se confirma la etapa.

### Requirement: Encuesta inicial aprobada
El sistema MUST registrar experiencia, frecuencia en 30 días, herramientas, usos, reacción ante respuestas inadecuadas, verificación de información, acceso pago y pagador, objetivos (hasta tres) y problema concreto opcional. MUST omitir herramientas/usos/reacción/verificación para quien nunca usó IA; las opciones No y Prefiero no responder sobre pagos son excluyentes y no se solicitan importes. MUST conservar la encuesta enviada como línea de base y permitir guardar borradores antes de enviarla.

#### Scenario: Principiante con acceso pago institucional
- **WHEN** un principiante responde la encuesta
- **THEN** puede indicar acceso pago institucional, omite cuatro preguntas de uso y recibe un aviso de preparación previa sin bloqueo de contenido.

#### Scenario: Opciones contradictorias
- **WHEN** se envía acceso pago junto con No o se eligen más de tres objetivos
- **THEN** se rechaza el envío con un mensaje corregible.

### Requirement: Preparación permanente y aceptación
El sistema MUST explicar que se necesita computadora con Internet y acceso a ChatGPT, Gemini, Claude o similar, que no se requiere suscripción paga y que se necesitan conocimientos previos porque no se enseña su uso desde cero. MUST conservar este mensaje en el resumen estudiantil después del onboarding y exigir aceptación explícita para finalizar.

#### Scenario: Finalización
- **WHEN** el alumno terminó las dos primeras etapas y acepta los requisitos
- **THEN** se registra la finalización y las indicaciones siguen visibles en el resumen.

### Requirement: Seguimiento autorizado
Administradores y docentes asignados MUST poder consultar progreso y respuestas del curso; alumnos y docentes ajenos MUST NOT acceder a datos de otros. Las solicitudes de cambio de email MUST quedar disponibles para administración.

#### Scenario: Consulta docente
- **WHEN** un docente asignado consulta el seguimiento
- **THEN** ve avance por etapa y las respuestas enviadas, con conteos de experiencia y acceso pago.
