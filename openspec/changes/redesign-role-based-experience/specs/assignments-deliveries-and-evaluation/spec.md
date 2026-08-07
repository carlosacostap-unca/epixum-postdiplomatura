## MODIFIED Requirements

### Requirement: Cierre por vencimiento
El estudiante MUST NOT crear ni modificar entregas después de la fecha límite del trabajo y MUST ver con anticipación el estado temporal y la acción disponible.

#### Scenario: Trabajo vigente
- **WHEN** el plazo continúa abierto
- **THEN** la interfaz muestra la fecha límite, el tiempo relativo y si existe una entrega guardada

#### Scenario: Plazo próximo
- **WHEN** faltan menos de 72 horas para el vencimiento
- **THEN** el trabajo se identifica como próximo a vencer sin depender solo del color

#### Scenario: Plazo vencido
- **WHEN** la hora actual supera `dueDate`
- **THEN** la interfaz deshabilita la entrega y explica el motivo
- **AND** la acción del servidor rechaza igualmente el cambio

### Requirement: Revisión docente
Los docentes y administradores MUST poder listar las entregas, buscar por estudiante, filtrar por estado, descargar sus archivos y abrir el detalle de evaluación, priorizando las que requieren atención.

#### Scenario: Listado de entregas
- **WHEN** un docente abre un trabajo
- **THEN** ve estudiante, fecha, archivo y estado de evaluación de cada entrega
- **AND** las entregas sin evaluar se distinguen mediante texto y estado semántico

#### Scenario: Filtrado de revisión
- **WHEN** el docente filtra entregas pendientes, en borrador o publicadas
- **THEN** la lista conserva solo los resultados coincidentes y su conteo

#### Scenario: Descarga docente
- **WHEN** solicita un archivo de una entrega
- **THEN** el servidor valida su rol y entrega una URL prefirmada temporal

### Requirement: Borrador y publicación de evaluación
Una evaluación MUST admitir nota, devolución, veredicto y estado `draft` o `published`, y la interfaz MUST diferenciar claramente guardar para continuar de publicar para el estudiante.

#### Scenario: Guardado como borrador
- **WHEN** el docente guarda una evaluación con estado `draft`
- **THEN** puede continuar editándola
- **AND** el estudiante no ve todavía la devolución

#### Scenario: Publicación
- **WHEN** el docente confirma la publicación
- **THEN** el estudiante ve nota, feedback y el veredicto `Aprobado` o `Corregir y reenviar`
- **AND** el docente recibe confirmación del cambio de visibilidad

## ADDED Requirements

### Requirement: Próxima acción académica
Las portadas de estudiante y docente MUST resumir trabajos que requieren acción y MUST enlazar directamente al trabajo o entrega correspondiente.

#### Scenario: Estudiante con trabajo pendiente
- **WHEN** existe un trabajo vigente sin entrega
- **THEN** la portada lo ordena por vencimiento y permite abrirlo directamente

#### Scenario: Docente con entrega pendiente
- **WHEN** existe una entrega sin evaluación publicada
- **THEN** la portada docente muestra el pendiente y permite abrir su revisión
