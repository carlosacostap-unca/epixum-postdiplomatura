## ADDED Requirements

### Requirement: Modelo persistente de invitaciones
PocketBase MUST persistir cada invitación con un curso, un email normalizado, un estado y, después de la activación, la identidad del estudiante correspondiente, imponiendo unicidad por curso y email normalizado.

#### Scenario: Invitación anterior al registro
- **WHEN** un administrador autoriza un email que todavía no posee usuario
- **THEN** PocketBase conserva la invitación sin exigir una relación de estudiante

#### Scenario: Activación posterior
- **WHEN** el propietario del email activa la invitación
- **THEN** la invitación registra el estado `activada` y la identidad autenticada

#### Scenario: Eliminación del curso
- **WHEN** se elimina un curso
- **THEN** sus invitaciones y registros de intentos se eliminan en cascada

### Requirement: Reglas de acceso a invitaciones
Las reglas de PocketBase MUST permitir la administración completa de invitaciones solamente a administradores, MUST permitir al estudiante leer exclusivamente las invitaciones activables de su propio email y MUST impedir que docentes o estudiantes alteren emails autorizados.

#### Scenario: Lectura del destinatario
- **WHEN** un estudiante consulta invitaciones con el mismo email normalizado que su identidad autenticada
- **THEN** PocketBase permite leer únicamente los datos seguros necesarios para la activación

#### Scenario: Enumeración de invitados
- **WHEN** un estudiante o docente intenta listar emails invitados de un curso
- **THEN** PocketBase rechaza la consulta aunque el docente esté asignado

#### Scenario: Mutación no administrativa
- **WHEN** un cliente no administrador intenta crear, revocar o cambiar el email de una invitación
- **THEN** PocketBase rechaza la operación

### Requirement: Registro protegido de intentos fallidos
PocketBase MUST conservar evidencia temporal de los intentos fallidos por invitación y estudiante sin almacenar la contraseña ingresada ni su hash.

#### Scenario: Contraseña incorrecta
- **WHEN** una validación de contraseña falla
- **THEN** se registra el curso, la invitación, el estudiante y el momento del intento
- **AND** no se persiste ningún valor derivado de la contraseña

#### Scenario: Manipulación del contador
- **WHEN** un estudiante intenta eliminar o modificar sus intentos para evitar el bloqueo
- **THEN** PocketBase rechaza la operación

## MODIFIED Requirements

### Requirement: Fuente de verdad de dominio
PocketBase MUST ser la fuente persistente de usuarios, cursos, matrículas, invitaciones, intentos de activación, clases, trabajos, recursos, entregas, consultas y respuestas.

#### Scenario: Lectura del servidor
- **WHEN** una página dinámica necesita datos del dominio
- **THEN** usa un cliente PocketBase inicializado con la sesión HttpOnly actual
- **AND** las relaciones necesarias se expanden explícitamente

### Requirement: Reglas de matrículas
Las reglas de PocketBase MUST permitir a un estudiante leer sus matrículas, MUST bloquear toda creación directa desde clientes regulares y MUST reservar la creación a una Server Action autenticada que valide identidad, modalidad, curso, prueba HMAC y, cuando corresponda, una invitación pendiente del mismo email antes de persistir mediante un cliente de servicio exclusivo del servidor.

#### Scenario: Alta legítima por clave
- **WHEN** la Server Action valida que `student` coincide con la identidad autenticada, el curso utiliza `clave` y la clave coincide con el HMAC oculto
- **THEN** el cliente de servicio crea la matrícula

#### Scenario: Alta legítima por invitación
- **WHEN** la Server Action valida que `student` coincide con la identidad autenticada, el curso utiliza `invitacion_contrasena`, la invitación pendiente pertenece a su email y la contraseña coincide con el HMAC oculto
- **THEN** el cliente de servicio crea la matrícula y activa la invitación

#### Scenario: Alta directa
- **WHEN** un cliente regular intenta crear una matrícula con o sin valores enviados para campos ocultos
- **THEN** PocketBase rechaza la operación aunque conozca la clave o contraseña y evite la interfaz Next.js

#### Scenario: Lectura docente
- **WHEN** un docente asignado consulta matrículas de su curso
- **THEN** las reglas permiten listar y expandir los estudiantes correspondientes

### Requirement: Migración reproducible
El repositorio MUST incluir una migración idempotente capaz de agregar la modalidad de matrícula, la contraseña protegida, las invitaciones y los intentos sin eliminar cursos, usuarios, matrículas ni contenido existentes.

#### Scenario: Primera ejecución sobre datos actuales
- **WHEN** el script se ejecuta sobre el esquema vigente
- **THEN** inicializa todos los cursos existentes con modalidad `clave`
- **AND** conserva sus claves y matrículas actuales
- **AND** crea las colecciones, campos, índices y reglas de doble validación

#### Scenario: Nueva ejecución
- **WHEN** el esquema ya contiene la doble validación
- **THEN** el script reconcilia campos y reglas sin duplicar registros ni índices
