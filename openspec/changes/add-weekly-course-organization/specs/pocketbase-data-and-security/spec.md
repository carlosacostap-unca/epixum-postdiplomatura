## MODIFIED Requirements

### Requirement: Fuente de verdad de dominio
PocketBase MUST ser la fuente persistente de usuarios, cursos, matrículas, semanas, clases, trabajos, recursos, entregas, consultas y respuestas.

#### Scenario: Lectura del servidor
- **WHEN** una página dinámica necesita datos del dominio
- **THEN** usa un cliente PocketBase inicializado con la sesión HttpOnly actual
- **AND** las relaciones necesarias se expanden explícitamente

## ADDED Requirements

### Requirement: Integridad de la estructura semanal
PocketBase MUST relacionar cada semana con exactamente un curso, MUST impedir números de semana duplicados dentro de ese curso y MUST permitir que clases, trabajos y consultas tengan como máximo una semana del mismo curso.

#### Scenario: Eliminación de una semana
- **WHEN** un docente elimina una semana
- **THEN** su contenido se conserva y pasa a quedar sin semana
- **AND** no se eliminan clases, trabajos, consultas, entregas ni respuestas

#### Scenario: Relación contradictoria
- **WHEN** un cliente intenta asociar contenido con una semana de otro curso
- **THEN** la validación del servidor rechaza el cambio aunque se evite la interfaz

#### Scenario: Número concurrente duplicado
- **WHEN** dos operaciones intentan crear el mismo número de semana en un curso
- **THEN** una restricción única permite persistir como máximo una

### Requirement: Reglas de acceso a semanas
Las reglas de PocketBase MUST permitir gestionar semanas solamente a docentes asignados al curso y MUST limitar la lectura estudiantil a personas matriculadas y semanas efectivamente visibles.

#### Scenario: Gestión docente legítima
- **WHEN** un docente incluido en `course.teachers` crea, edita o elimina una semana de ese curso semanal
- **THEN** PocketBase permite la operación

#### Scenario: Gestión docente ajena
- **WHEN** un docente intenta modificar una semana de un curso no asignado
- **THEN** PocketBase rechaza la operación

#### Scenario: Lectura estudiantil anticipada
- **WHEN** un estudiante intenta leer una semana borrador o programada para el futuro
- **THEN** PocketBase no devuelve la semana ni su contenido protegido

### Requirement: Migración semanal reproducible
El repositorio MUST incluir una migración idempotente que cree la modalidad y estructura semanal sin eliminar ni reasignar contenido existente.

#### Scenario: Primera ejecución
- **WHEN** la migración se ejecuta sobre el esquema vigente
- **THEN** añade la modalidad con valor `tradicional`, crea las semanas y relaciones opcionales, índices y reglas
- **AND** conserva todos los cursos, clases, trabajos, consultas y entregas existentes

#### Scenario: Nueva ejecución
- **WHEN** el esquema semanal ya está disponible
- **THEN** la migración conserva campos, reglas, semanas y relaciones existentes sin crear duplicados
