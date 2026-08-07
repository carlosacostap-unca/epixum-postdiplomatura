## MODIFIED Requirements

### Requirement: Listado, filtrado y búsqueda
El foro MUST permitir filtrar por curso, clase, trabajo, estado o autor, MUST buscar coincidencias en consulta, autor, contenido relacionado y respuestas, y MUST presentar conteos y actividad que ayuden a priorizar la atención.

#### Scenario: Búsqueda textual
- **WHEN** el usuario ingresa un término
- **THEN** aparecen consultas que coinciden en título, descripción, autor, clase, trabajo o hasta las respuestas consultadas

#### Scenario: Filtrado por atención
- **WHEN** un docente selecciona consultas pendientes o resueltas
- **THEN** el listado muestra únicamente el estado solicitado y la cantidad de resultados

#### Scenario: Orden del foro
- **WHEN** se muestra un conjunto de consultas
- **THEN** las consultas pendientes se pueden ordenar por actividad reciente o antigüedad
- **AND** las consultas resueltas siguen disponibles mediante filtro

### Requirement: Estado de resolución
El autor, un docente o un administrador MUST poder cambiar una consulta entre `Pendiente` y `Resuelta` según las reglas de PocketBase, y la interfaz MUST mantener visible ese estado en listado y detalle.

#### Scenario: Consulta resuelta
- **WHEN** un actor autorizado marca la consulta como resuelta
- **THEN** el nuevo estado se muestra tanto en el listado como en el detalle
- **AND** el cambio se confirma sin sacar al usuario del contexto

#### Scenario: Reapertura
- **WHEN** un actor autorizado vuelve a marcar una consulta como pendiente
- **THEN** la consulta regresa al conjunto que requiere atención

#### Scenario: Actor no autorizado
- **WHEN** otro usuario intenta cambiar el estado sin permiso
- **THEN** PocketBase rechaza la actualización y la interfaz conserva el estado previo

## ADDED Requirements

### Requirement: Resumen de consultas por rol
Las portadas de docente y estudiante MUST mostrar consultas pendientes relevantes para su alcance y MUST enlazar al detalle o listado filtrado.

#### Scenario: Docente con consultas pendientes
- **WHEN** existen consultas pendientes en sus cursos asignados
- **THEN** la portada docente muestra el total y las de mayor antigüedad o actividad

#### Scenario: Estudiante con consulta propia pendiente
- **WHEN** una consulta creada por el estudiante continúa pendiente
- **THEN** la portada o el curso permite retomarla sin recorrer todo el foro
