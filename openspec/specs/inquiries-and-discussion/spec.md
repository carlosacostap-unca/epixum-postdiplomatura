# Consultas y discusión

## Purpose
Definir el foro de consultas asociado a cursos, clases o trabajos, sus filtros, respuestas y estados.

## Requirements

### Requirement: Creación contextual de consultas
Un usuario autenticado MUST poder crear una consulta con título, descripción y estado inicial `Pendiente`, asociándola opcionalmente a un curso, clase o trabajo práctico.

#### Scenario: Consulta de curso
- **WHEN** un estudiante matriculado crea una consulta desde su curso
- **THEN** la consulta conserva el curso y al usuario como autor
- **AND** aparece en el foro correspondiente

#### Scenario: Consulta de clase o trabajo
- **WHEN** se crea desde una clase o trabajo
- **THEN** el registro mantiene la relación contextual seleccionada

### Requirement: Listado, filtrado y búsqueda
El foro MUST permitir filtrar por curso, clase, trabajo, estado o autor, y MUST buscar coincidencias en consulta, autor, contenido relacionado y respuestas.

#### Scenario: Búsqueda textual
- **WHEN** el usuario ingresa un término
- **THEN** aparecen consultas que coinciden en título, descripción, autor, clase, trabajo o hasta las respuestas consultadas

#### Scenario: Orden del foro
- **WHEN** se muestra un conjunto de consultas
- **THEN** se ordena desde la creación más reciente

### Requirement: Respuestas cronológicas
Los usuarios autenticados MUST poder responder una consulta visible y las respuestas MUST mostrarse en orden de creación ascendente con identidad del autor.

#### Scenario: Nueva respuesta
- **WHEN** un usuario envía contenido no vacío
- **THEN** se crea una respuesta relacionada con la consulta y su autor
- **AND** el debate se revalida

### Requirement: Estado de resolución
El autor, un docente o un administrador MUST poder cambiar una consulta entre `Pendiente` y `Resuelta` según las reglas de PocketBase.

#### Scenario: Consulta resuelta
- **WHEN** un actor autorizado marca la consulta como resuelta
- **THEN** el nuevo estado se muestra tanto en el listado como en el detalle

#### Scenario: Actor no autorizado
- **WHEN** otro usuario intenta cambiar el estado sin permiso
- **THEN** PocketBase rechaza la actualización

### Requirement: Eliminación autorizada
La eliminación de consultas o respuestas MUST respetar autoría y privilegios docentes o administrativos definidos en las reglas de datos.

#### Scenario: Eliminación permitida
- **WHEN** un actor autorizado elimina una consulta o respuesta
- **THEN** el registro desaparece y las vistas afectadas se revalidan

#### Scenario: Eliminación ajena
- **WHEN** un usuario sin permiso intenta eliminar contenido ajeno
- **THEN** la operación falla sin ocultar otros datos válidos del foro
