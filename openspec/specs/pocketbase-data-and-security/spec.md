# Datos y seguridad en PocketBase

## Purpose
Definir PocketBase como fuente de verdad, sus relaciones principales, reglas de acceso y garantías de consistencia para la plataforma educativa.

## Requirements

### Requirement: Fuente de verdad de dominio
PocketBase MUST ser la fuente persistente de usuarios, cursos, matrículas, clases, trabajos, contenidos independientes, recursos, entregas, consultas y respuestas.

#### Scenario: Lectura del servidor
- **WHEN** una página dinámica necesita datos del dominio
- **THEN** usa un cliente PocketBase inicializado con la sesión HttpOnly actual
- **AND** las relaciones necesarias se expanden explícitamente

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

### Requirement: Datos y reglas de contenidos independientes
PocketBase MUST persistir la habilitación por curso, los contenidos independientes, su orden y sus recursos, y MUST aplicar reglas que respeten el rol, la asignación docente, la matrícula y la configuración del curso.

#### Scenario: Escritura docente autorizada
- **WHEN** un docente asignado gestiona un contenido de un curso habilitado
- **THEN** las reglas permiten la operación dentro de ese curso

#### Scenario: Lectura estudiantil autorizada
- **WHEN** un estudiante matriculado consulta contenidos de un curso habilitado
- **THEN** las reglas permiten leer los contenidos y recursos de ese curso

#### Scenario: Acceso directo no autorizado
- **WHEN** un cliente intenta leer o escribir contenidos sin cumplir rol, asignación, matrícula o habilitación
- **THEN** PocketBase rechaza la operación aunque el cliente evite la interfaz Next.js

### Requirement: Migración compatible e idempotente de contenidos
El repositorio MUST incluir una migración idempotente que agregue la configuración, colección, relaciones, índices y reglas necesarias sin eliminar datos existentes.

#### Scenario: Primera ejecución
- **WHEN** la migración se ejecuta sobre un esquema anterior
- **THEN** todos los cursos existentes quedan con contenidos independientes deshabilitados
- **AND** se conservan sus clases, trabajos, semanas, consultas, recursos y matrículas

#### Scenario: Ejecución repetida
- **WHEN** la migración se ejecuta nuevamente sobre un esquema ya actualizado
- **THEN** no duplica campos, índices ni colecciones
- **AND** conserva los contenidos y configuraciones existentes

### Requirement: Modelo de matrículas independiente
`course_enrollments` MUST relacionar exactamente un curso con exactamente un estudiante y MUST imponer un índice único sobre esa combinación.

#### Scenario: Curso o usuario eliminado
- **WHEN** se elimina un curso o estudiante relacionado
- **THEN** la relación de matrícula se elimina en cascada

#### Scenario: Duplicado concurrente
- **WHEN** dos solicitudes intentan crear la misma matrícula
- **THEN** el índice único permite persistir como máximo una

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

### Requirement: Manejo de secretos
Tokens, contraseñas, secretos HMAC y credenciales de proveedores MUST permanecer en variables de entorno ignoradas por Git y MUST NOT aparecer en logs ni respuestas.

#### Scenario: Error de autenticación o integración
- **WHEN** una operación falla
- **THEN** los logs pueden incluir estado y mensaje sanitizado
- **AND** nunca incluyen el token, la contraseña o el secreto utilizado

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
