## MODIFIED Requirements

### Requirement: Reglas de matrículas
Las reglas de PocketBase MUST permitir a una persona autenticada leer sus propias matrículas, MUST bloquear toda creación directa desde clientes regulares y MUST reservar la creación a Server Actions autenticadas que validen identidad, curso, unicidad y exclusividad de participación; una matrícula propia MUST validar además la modalidad y credencial correspondiente, mientras que una matrícula administrativa directa MUST exigir privilegio global de administrador. El retiro administrativo MUST afectar solamente la matrícula seleccionada.

#### Scenario: Alta legítima por clave
- **WHEN** la Server Action valida que `student` coincide con la identidad autenticada, el curso utiliza `clave`, la clave coincide con el HMAC oculto y la persona no está en `teachers`
- **THEN** el cliente de servicio crea la matrícula aunque la cuenta enseñe en otros cursos

#### Scenario: Alta legítima por invitación
- **WHEN** la Server Action valida que `student` coincide con la identidad autenticada, el curso utiliza `invitacion_contrasena`, la invitación pendiente pertenece a su email, la contraseña coincide con el HMAC oculto y la persona no está en `teachers`
- **THEN** el cliente de servicio crea la matrícula y activa la invitación

#### Scenario: Alta administrativa directa
- **WHEN** una Server Action confirma privilegio `admin`, existencia de usuario y curso, ausencia de matrícula y ausencia de asignación docente en el mismo curso
- **THEN** el cliente de servicio crea la matrícula sin exigir una credencial del alumno

#### Scenario: Alta directa
- **WHEN** un cliente regular intenta crear una matrícula con o sin valores enviados para campos ocultos
- **THEN** PocketBase rechaza la operación aunque conozca la clave o contraseña y evite la interfaz Next.js

#### Scenario: Alta incompatible
- **WHEN** la identidad seleccionada ya está incluida en `teachers` del curso
- **THEN** la Server Action rechaza la matrícula antes de usar el cliente de servicio

#### Scenario: Lectura docente
- **WHEN** una persona incluida en `teachers` consulta matrículas de su curso
- **THEN** las reglas permiten listar y expandir los estudiantes correspondientes con independencia de su valor global de compatibilidad

#### Scenario: Retiro administrativo
- **WHEN** una Server Action confirma privilegio `admin` y la matrícula pertenece al curso administrado
- **THEN** elimina únicamente ese registro de matrícula
- **AND** conserva los registros históricos que referencian a la persona, el curso o sus trabajos

## ADDED Requirements

### Requirement: Mutaciones administrativas verificadas de participantes
Las acciones administrativas de participantes MUST validar la sesión y el privilegio `admin`, MUST resolver la participación dentro del curso indicado, MUST usar el cliente de servicio sólo después de completar las validaciones y MUST releer el estado persistido antes de comunicar éxito.

#### Scenario: Invocación sin privilegio
- **WHEN** una identidad sin privilegio administrativo invoca directamente una acción para agregar o retirar participantes
- **THEN** el servidor rechaza la operación antes de usar el cliente de servicio

#### Scenario: Cambio concurrente
- **WHEN** la participación o el curso cambian entre la carga de la interfaz y la confirmación
- **THEN** el servidor decide usando el estado persistido vigente
- **AND** no elimina ni agrega una participación diferente de la solicitada

#### Scenario: Verificación posterior
- **WHEN** una mutación autorizada informa éxito
- **THEN** una lectura posterior confirma exactamente la participación esperada
- **AND** las superficies administrativas, docentes y estudiantiles afectadas se actualizan
