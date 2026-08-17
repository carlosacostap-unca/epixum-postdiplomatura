## MODIFIED Requirements

### Requirement: Fuente de verdad de dominio
PocketBase MUST ser la fuente persistente de usuarios, cursos, matrículas, clases, trabajos, contenidos independientes, recursos, entregas, consultas y respuestas.

#### Scenario: Lectura del servidor
- **WHEN** una página dinámica necesita datos del dominio
- **THEN** usa un cliente PocketBase inicializado con la sesión HttpOnly actual
- **AND** las relaciones necesarias se expanden explícitamente

## ADDED Requirements

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
