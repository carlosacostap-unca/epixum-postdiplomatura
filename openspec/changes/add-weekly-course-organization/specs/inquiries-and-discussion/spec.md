## MODIFIED Requirements

### Requirement: Creación contextual de consultas
Un usuario autenticado MUST poder crear una consulta con título, descripción y estado inicial `Pendiente`; en un curso tradicional MAY asociarla al curso, clase o trabajo práctico, mientras que una nueva consulta estudiantil de un curso semanal MUST pertenecer a una semana visible y MUST NOT admitirse como consulta general del curso.

#### Scenario: Consulta de curso tradicional
- **WHEN** un estudiante matriculado crea una consulta desde un curso tradicional
- **THEN** la consulta conserva el curso y al usuario como autor
- **AND** aparece en el foro correspondiente

#### Scenario: Consulta estudiantil de curso semanal
- **WHEN** un estudiante matriculado crea una consulta desde un curso semanal
- **THEN** debe seleccionar una semana visible o utilizar la semana de la clase o trabajo contextual
- **AND** la consulta conserva curso, semana y autor

#### Scenario: Semana omitida en curso semanal
- **WHEN** un estudiante intenta crear una consulta semanal sin semana
- **THEN** el sistema no crea una consulta general
- **AND** mantiene el formulario con un error asociado al selector de semana

#### Scenario: Consulta de clase o trabajo
- **WHEN** una consulta semanal se crea desde una clase o trabajo asignado
- **THEN** utiliza la misma semana del contenido relacionado
- **AND** el sistema rechaza cualquier semana contradictoria

#### Scenario: Consulta docente sin asignar
- **WHEN** un docente crea o desasigna una consulta sin semana dentro de un curso semanal
- **THEN** la consulta queda en la bandeja docente sin asignar y no se muestra a estudiantes

### Requirement: Listado, filtrado y búsqueda
El foro MUST permitir filtrar por curso, semana, clase, trabajo, estado o autor, y MUST buscar coincidencias en consulta, autor, contenido relacionado y respuestas; en cursos semanales los estudiantes MUST ver solamente consultas pertenecientes a semanas visibles.

#### Scenario: Búsqueda textual
- **WHEN** el usuario ingresa un término
- **THEN** aparecen consultas visibles que coinciden en título, descripción, autor, semana, clase, trabajo o respuestas consultadas

#### Scenario: Filtro de semana
- **WHEN** un docente o estudiante selecciona una semana
- **THEN** el listado conserva solamente las consultas relacionadas con esa semana y permitidas para su rol

#### Scenario: Orden del foro
- **WHEN** se muestra un conjunto de consultas
- **THEN** se ordena desde la creación más reciente
