## ADDED Requirements

### Requirement: Datos y reglas de preevaluación
PocketBase MUST persistir la habilitación por curso, la configuración privada por trabajo y los intentos de preevaluación, y MUST aplicar reglas que respeten rol administrativo, asignación docente, relaciones de curso, trabajo y entrega, y separación respecto de la evaluación oficial.

#### Scenario: Configuración docente autorizada
- **WHEN** un docente asignado consulta o modifica la configuración de un trabajo perteneciente a un curso habilitado
- **THEN** las reglas permiten la operación dentro de ese trabajo

#### Scenario: Lectura de intento autorizada
- **WHEN** un administrador o docente asignado consulta un intento de una entrega de su curso
- **THEN** puede leer estado, cobertura, configuración aplicada y resultado

#### Scenario: Acceso estudiantil o docente ajeno
- **WHEN** un estudiante o docente no asignado intenta leer configuraciones o intentos directamente en PocketBase
- **THEN** las reglas rechazan la operación

#### Scenario: Escritura desde cliente regular
- **WHEN** un cliente intenta crear o alterar un intento evitando la acción segura del servidor
- **THEN** PocketBase rechaza la escritura aunque el usuario sea docente

### Requirement: Consistencia y trazabilidad de intentos
Cada intento MUST relacionar un único curso, trabajo, entrega y solicitante compatibles entre sí, MUST conservar el commit y la configuración aplicada, y MUST impedir que su resultado sea confundido con una evaluación publicada.

#### Scenario: Relaciones incompatibles
- **WHEN** se intenta asociar un intento a una entrega cuyo trabajo o curso no coincide
- **THEN** la capa de servidor rechaza la escritura
- **AND** no invoca proveedores externos

#### Scenario: Eliminación de entrega
- **WHEN** se elimina una entrega relacionada
- **THEN** sus intentos se eliminan en cascada o quedan inaccesibles según la política definida por la migración
- **AND** no quedan intentos visibles asociados a una entrega inexistente

### Requirement: Migración compatible e idempotente de preevaluación
El repositorio MUST incluir una migración idempotente que agregue habilitación, configuración, intentos, índices y reglas sin eliminar entregas, evaluaciones ni prompts existentes.

#### Scenario: Primera ejecución
- **WHEN** la migración se ejecuta sobre el esquema anterior
- **THEN** todos los cursos quedan inicialmente con la capacidad deshabilitada
- **AND** las instrucciones `systemPrompt` existentes se preservan para su migración controlada a configuraciones inactivas
- **AND** las entregas y evaluaciones existentes permanecen sin cambios

#### Scenario: Ejecución repetida
- **WHEN** la migración se ejecuta sobre un esquema ya actualizado
- **THEN** no duplica campos, colecciones, configuraciones ni índices
- **AND** conserva habilitaciones, intentos y resultados existentes
