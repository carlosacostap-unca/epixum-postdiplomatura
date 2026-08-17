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
Las reglas de PocketBase MUST permitir a un estudiante leer sus matrículas y crearse una matrícula solamente para sí mismo, con un hash coincidente y un curso no borrador.

#### Scenario: Alta legítima
- **WHEN** `student` coincide con la identidad autenticada y `keyHash` coincide con el HMAC del curso
- **THEN** PocketBase permite crear la matrícula

#### Scenario: Alta directa sin clave
- **WHEN** un cliente intenta crear una matrícula sin hash válido o para otro usuario
- **THEN** PocketBase rechaza la operación aunque evite la interfaz Next.js

#### Scenario: Lectura docente
- **WHEN** un docente asignado consulta matrículas de su curso
- **THEN** las reglas permiten listar y expandir los estudiantes correspondientes

### Requirement: Reglas de usuarios y OAuth
La colección `users` MUST aceptar altas desde el contexto OAuth y MUST permitir que una cuenta sin rol establezca una única vez `estudiante`, sin permitir escaladas posteriores.

#### Scenario: Inicialización segura
- **WHEN** un registro OAuth nuevo todavía tiene rol vacío
- **THEN** puede actualizar su rol solamente a `estudiante`

#### Scenario: Cambio posterior
- **WHEN** el mismo usuario intenta modificar su rol nuevamente
- **THEN** la regla exige privilegios de administrador

### Requirement: Defensa en profundidad
Las operaciones sensibles MUST validar sesión y rol en las acciones del servidor además de depender de las reglas de PocketBase.

#### Scenario: Invocación directa de Server Action
- **WHEN** un cliente intenta llamar una acción sin pasar por su página protegida
- **THEN** la acción valida la identidad antes de leer, firmar o modificar datos sensibles

### Requirement: Manejo de secretos
Tokens, contraseñas, secretos HMAC y credenciales de proveedores MUST permanecer en variables de entorno ignoradas por Git y MUST NOT aparecer en logs ni respuestas.

#### Scenario: Error de autenticación o integración
- **WHEN** una operación falla
- **THEN** los logs pueden incluir estado y mensaje sanitizado
- **AND** nunca incluyen el token, la contraseña o el secreto utilizado

### Requirement: Migración reproducible
El repositorio MUST incluir una migración idempotente capaz de crear el esquema de matrículas, migrar relaciones heredadas y retirar el flujo anterior cuando se ejecuta con autorización de superusuario.

#### Scenario: Primera ejecución
- **WHEN** el script se ejecuta sobre el esquema heredado
- **THEN** agrega campos y colección, migra estudiantes y elimina `enrollment_requests`

#### Scenario: Nueva ejecución
- **WHEN** el esquema ya está migrado
- **THEN** el script conserva las matrículas existentes y no crea duplicados
