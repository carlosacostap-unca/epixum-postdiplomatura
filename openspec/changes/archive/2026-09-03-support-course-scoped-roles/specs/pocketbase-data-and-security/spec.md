## ADDED Requirements

### Requirement: Reglas contextuales de acceso a cursos
Las reglas de PocketBase MUST autorizar operaciones docentes mediante la pertenencia a `course.teachers`, operaciones estudiantiles mediante una matrícula propia y operaciones administrativas mediante el privilegio global `admin`, sin depender de que `users.role` sea globalmente `docente` o `estudiante`.

#### Scenario: Docente asignado
- **WHEN** un cliente autenticado intenta gestionar datos de un curso que lo incluye en `teachers`
- **THEN** PocketBase permite solamente las operaciones docentes admitidas para ese curso

#### Scenario: Estudiante matriculado
- **WHEN** un cliente autenticado intenta leer o crear datos estudiantiles de un curso donde posee matrícula
- **THEN** PocketBase permite solamente las operaciones estudiantiles admitidas para ese curso y su propia identidad

#### Scenario: Relación en otro curso
- **WHEN** un cliente presenta una asignación docente o matrícula perteneciente a un curso diferente del recurso solicitado
- **THEN** PocketBase rechaza la operación

### Requirement: Auditoría verificable de compatibilidad
El repositorio MUST proporcionar una auditoría de solo lectura que compare identidades, cursos, docentes y matrículas antes y después del despliegue, detecte conflictos de rol dentro de cada curso y no exponga secretos.

#### Scenario: Auditoría previa satisfactoria
- **WHEN** los datos no contienen intersecciones entre docentes y estudiantes del mismo curso ni relaciones inválidas
- **THEN** la auditoría informa que el esquema puede migrarse
- **AND** registra conteos y huellas comparables de IDs y relaciones sin incluir credenciales ni hashes secretos

#### Scenario: Auditoría posterior
- **WHEN** finaliza el despliegue
- **THEN** la auditoría confirma igualdad de IDs y relaciones preexistentes
- **AND** informa cualquier diferencia inesperada como fallo de verificación

## MODIFIED Requirements

### Requirement: Reglas de matrículas
Las reglas de PocketBase MUST permitir a una persona autenticada leer sus propias matrículas, MUST bloquear toda creación directa desde clientes regulares y MUST reservar la creación a una Server Action autenticada que valide identidad, modalidad, curso, prueba HMAC, ausencia de asignación docente en ese curso y, cuando corresponda, una invitación pendiente del mismo email antes de persistir mediante un cliente de servicio exclusivo del servidor.

#### Scenario: Alta legítima por clave
- **WHEN** la Server Action valida que `student` coincide con la identidad autenticada, el curso utiliza `clave`, la clave coincide con el HMAC oculto y la persona no está en `teachers`
- **THEN** el cliente de servicio crea la matrícula aunque la cuenta enseñe en otros cursos

#### Scenario: Alta legítima por invitación
- **WHEN** la Server Action valida que `student` coincide con la identidad autenticada, el curso utiliza `invitacion_contrasena`, la invitación pendiente pertenece a su email, la contraseña coincide con el HMAC oculto y la persona no está en `teachers`
- **THEN** el cliente de servicio crea la matrícula y activa la invitación

#### Scenario: Alta directa
- **WHEN** un cliente regular intenta crear una matrícula con o sin valores enviados para campos ocultos
- **THEN** PocketBase rechaza la operación aunque conozca la clave o contraseña y evite la interfaz Next.js

#### Scenario: Alta incompatible
- **WHEN** la identidad autenticada ya está incluida en `teachers` del curso
- **THEN** la Server Action rechaza la matrícula antes de usar el cliente de servicio

#### Scenario: Lectura docente
- **WHEN** una persona incluida en `teachers` consulta matrículas de su curso
- **THEN** las reglas permiten listar y expandir los estudiantes correspondientes con independencia de su valor global de compatibilidad

### Requirement: Reglas de usuarios y OAuth
La colección `users` MUST aceptar altas desde el contexto OAuth, MUST permitir que una cuenta sin rol establezca una única vez `estudiante` como valor compatible y MUST reservar los cambios de privilegio global a administradores, sin usar ese valor compatible como fuente de roles por curso.

#### Scenario: Inicialización segura
- **WHEN** un registro OAuth nuevo todavía tiene rol vacío
- **THEN** puede actualizar su rol solamente a `estudiante`
- **AND** no obtiene privilegios docentes ni administrativos por esa inicialización

#### Scenario: Cambio posterior no autorizado
- **WHEN** la misma persona intenta modificar su privilegio global nuevamente
- **THEN** la regla exige privilegios de administrador

#### Scenario: Participación contextual posterior
- **WHEN** una cuenta es asignada a `teachers` o recibe una matrícula
- **THEN** PocketBase conserva el valor global existente
- **AND** la autorización del curso se deriva de la nueva relación

### Requirement: Defensa en profundidad
Las operaciones sensibles MUST validar sesión, privilegio global y relación contextual con el curso en las acciones del servidor además de depender de las reglas de PocketBase.

#### Scenario: Invocación directa de Server Action
- **WHEN** un cliente intenta llamar una acción sin pasar por su página protegida
- **THEN** la acción valida la identidad y la relación correspondiente con el mismo curso antes de leer, firmar o modificar datos sensibles

#### Scenario: Rol válido en otro curso
- **WHEN** la identidad posee el rol requerido solamente en un curso diferente
- **THEN** la acción rechaza la operación solicitada

### Requirement: Migración reproducible
El repositorio MUST incluir una migración idempotente capaz de actualizar reglas y soportes de roles contextuales sin eliminar, recrear ni cambiar los IDs de usuarios, cursos, matrículas, invitaciones o contenidos existentes.

#### Scenario: Primera ejecución sobre datos compatibles
- **WHEN** la auditoría previa no detecta conflictos y se ejecuta la migración
- **THEN** se actualizan las reglas necesarias
- **AND** se conservan exactamente `courses.teachers`, todos los registros de `course_enrollments` y sus relaciones

#### Scenario: Conflicto preexistente
- **WHEN** la auditoría encuentra una identidad como docente y estudiante del mismo curso
- **THEN** la migración termina sin modificar datos ni reglas

#### Scenario: Nueva ejecución
- **WHEN** el esquema ya soporta roles contextuales
- **THEN** el script reconcilia reglas sin duplicar registros ni índices
