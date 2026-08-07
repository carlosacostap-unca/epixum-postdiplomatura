## Purpose

Definir la preautorización por email y la activación segura de matrículas mediante una contraseña compartida en los cursos que requieren doble validación.

## ADDED Requirements

### Requirement: Invitaciones administrativas por email
El sistema MUST permitir solamente a los administradores autorizar emails para un curso con modalidad `invitacion_contrasena`, tanto individualmente como mediante una carga masiva, y MUST NOT enviar correos electrónicos como parte del proceso.

#### Scenario: Carga individual
- **WHEN** un administrador agrega un email válido a un curso con doble validación
- **THEN** se crea una invitación en estado `pendiente`
- **AND** el sistema no exige que todavía exista un usuario con ese email

#### Scenario: Carga masiva
- **WHEN** un administrador pega una lista con emails separados por líneas, comas o punto y coma
- **THEN** el sistema normaliza, valida y deduplica las direcciones antes de confirmar
- **AND** informa cuántas invitaciones fueron creadas, ya existían o eran inválidas

#### Scenario: Docente intenta administrar invitados
- **WHEN** un docente intenta agregar, listar o revocar emails invitados
- **THEN** el sistema rechaza la operación aunque el docente esté asignado al curso

#### Scenario: Sin envío de invitación
- **WHEN** se crea una o más invitaciones
- **THEN** no se invoca ningún proveedor, plantilla ni proceso de correo electrónico

### Requirement: Identidad autorizada y normalización
El sistema MUST asociar una invitación únicamente con el email verificado por Google del estudiante autenticado, comparando la dirección en minúsculas y sin espacios al inicio o al final.

#### Scenario: Coincidencia normalizada
- **WHEN** el email verificado de Google coincide con una invitación pendiente después de normalizar mayúsculas y espacios exteriores
- **THEN** el sistema reconoce al estudiante como destinatario de esa invitación

#### Scenario: Cuenta diferente
- **WHEN** un usuario autenticado intenta activar una invitación emitida para otro email
- **THEN** el sistema no muestra ni activa esa invitación
- **AND** no revela información sobre el email autorizado

### Requirement: Presentación automática de invitaciones pendientes
El panel del estudiante MUST mostrar automáticamente sus invitaciones pendientes para cursos activos con modalidad `invitacion_contrasena`, separadas de las matrículas vigentes.

#### Scenario: Invitación pendiente después del login
- **WHEN** un estudiante autenticado abre su panel y su email coincide con una invitación pendiente
- **THEN** ve una tarjeta con el curso y una acción para ingresar la contraseña
- **AND** todavía no puede acceder al contenido del curso

#### Scenario: Varias invitaciones
- **WHEN** el mismo email tiene invitaciones pendientes para varios cursos
- **THEN** el panel muestra cada curso por separado y permite activarlos independientemente

#### Scenario: Modalidad temporalmente inactiva
- **WHEN** una invitación sigue pendiente pero el curso utiliza temporalmente la modalidad por clave
- **THEN** el panel no ofrece activarla
- **AND** la invitación se conserva para una futura reactivación de la doble validación

### Requirement: Activación con doble validación
El sistema MUST crear la matrícula definitiva solamente cuando el email verificado coincide con una invitación `pendiente`, el curso no está en borrador y la contraseña compartida es correcta.

#### Scenario: Activación correcta
- **WHEN** el estudiante invitado ingresa la contraseña correcta dentro de un curso habilitado
- **THEN** se crea como máximo una matrícula para el estudiante y el curso
- **AND** la invitación pasa a `activada`
- **AND** el curso aparece en “Mis cursos” con acceso a su contenido autorizado

#### Scenario: Contraseña incorrecta
- **WHEN** el estudiante invitado ingresa una contraseña incorrecta
- **THEN** no se crea ninguna matrícula
- **AND** el intento fallido se contabiliza para ese estudiante y curso

#### Scenario: Curso en borrador o modalidad incorrecta
- **WHEN** se intenta activar una invitación de un curso en borrador o que ya no utiliza doble validación
- **THEN** el sistema conserva la invitación pero rechaza la activación

#### Scenario: Activación repetida
- **WHEN** un estudiante ya matriculado vuelve a intentar activar la misma invitación
- **THEN** no se duplica la matrícula
- **AND** la interfaz permite continuar al curso existente

### Requirement: Contraseña compartida protegida
La contraseña de doble validación MUST contener entre 8 y 64 caracteres, MUST distinguir mayúsculas de minúsculas y MUST almacenarse solamente mediante HMAC-SHA256 con un secreto del servidor.

#### Scenario: Administrador configura contraseña
- **WHEN** un administrador guarda una contraseña válida para cualquier curso
- **THEN** el sistema reemplaza el hash oculto sin exponer la contraseña ni el secreto

#### Scenario: Docente asignado configura contraseña
- **WHEN** un docente asignado guarda una contraseña válida en su curso
- **THEN** el sistema reemplaza el hash oculto de ese curso

#### Scenario: Docente fuera de alcance
- **WHEN** un docente intenta modificar la contraseña de un curso no asignado
- **THEN** el sistema rechaza la operación

#### Scenario: Rotación de contraseña
- **WHEN** un administrador o docente asignado cambia la contraseña
- **THEN** las invitaciones pendientes requieren inmediatamente la nueva contraseña
- **AND** las matrículas ya activadas conservan el acceso sin revalidación

### Requirement: Bloqueo temporal por intentos fallidos
El sistema MUST bloquear durante 15 minutos la activación de una invitación después de cinco contraseñas incorrectas consecutivas para el mismo estudiante y curso.

#### Scenario: Quinto intento incorrecto
- **WHEN** un estudiante acumula cinco intentos incorrectos consecutivos
- **THEN** el sistema impide nuevos intentos durante 15 minutos
- **AND** informa el bloqueo sin revelar la contraseña ni datos de otras invitaciones

#### Scenario: Intento durante el bloqueo
- **WHEN** el estudiante intenta validar nuevamente antes de finalizar el bloqueo
- **THEN** el sistema rechaza el intento sin comprobar la contraseña ingresada

#### Scenario: Fin del bloqueo
- **WHEN** transcurren 15 minutos desde el quinto intento fallido
- **THEN** el estudiante puede volver a intentar
- **AND** el contador comienza un nuevo ciclo

#### Scenario: Activación correcta
- **WHEN** el estudiante ingresa correctamente antes de alcanzar cinco errores
- **THEN** la matrícula se activa y cualquier contador de errores deja de afectar ese curso

### Requirement: Estados y revocación de invitaciones
Cada invitación MUST mantener uno de los estados `pendiente`, `activada` o `revocada`, MUST ser única por curso y email normalizado y MUST permanecer vigente sin vencimiento automático hasta activarse o ser revocada por un administrador.

#### Scenario: Invitación duplicada
- **WHEN** un administrador vuelve a cargar el mismo email normalizado para el mismo curso
- **THEN** el sistema no crea un registro duplicado
- **AND** comunica el estado existente

#### Scenario: Revocación pendiente
- **WHEN** un administrador revoca una invitación pendiente
- **THEN** la invitación pasa a `revocada` y ya no puede activarse

#### Scenario: Invitación sin vencimiento
- **WHEN** una invitación pendiente no es utilizada durante un período prolongado
- **THEN** permanece disponible mientras el curso conserve la doble validación y un administrador no la revoque
