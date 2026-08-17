# Contenidos independientes de curso

## Purpose

Definir la gestión, el orden y la visibilidad de materiales de estudio independientes de las clases, trabajos prácticos y semanas de cada curso habilitado.

## Requirements

### Requirement: Gestión docente condicionada por curso
El sistema MUST permitir que solamente un docente asignado cree, edite o elimine contenidos independientes cuando el administrador haya habilitado la característica en ese curso. Cada contenido MUST tener título, descripción enriquecida opcional y pertenecer a un único curso.

#### Scenario: Docente asignado crea contenido
- **WHEN** un docente asignado crea un contenido con título válido en un curso habilitado
- **THEN** el contenido queda relacionado con ese curso
- **AND** queda disponible inmediatamente sin un paso de publicación

#### Scenario: Curso sin contenidos habilitados
- **WHEN** un docente intenta crear o modificar un contenido en un curso con la característica deshabilitada
- **THEN** el sistema rechaza la operación

#### Scenario: Docente ajeno
- **WHEN** un docente intenta gestionar un contenido de un curso al que no está asignado
- **THEN** el sistema rechaza la operación aunque invoque directamente la acción o URL

### Requirement: Orden manual persistente
Los docentes asignados MUST poder cambiar manualmente el orden de los contenidos de un curso habilitado y el sistema MUST persistir un orden completo y estable por curso.

#### Scenario: Reordenamiento válido
- **WHEN** un docente asignado mueve un contenido a otra posición
- **THEN** las vistas docente y estudiante muestran todos los contenidos según el nuevo orden

#### Scenario: Reordenamiento fuera de alcance
- **WHEN** un usuario intenta incluir un contenido de otro curso o excluir contenidos existentes al enviar el nuevo orden
- **THEN** el sistema rechaza la operación sin aplicar un orden parcial

### Requirement: Consulta estudiantil inmediata
Un estudiante MUST estar matriculado y el curso MUST tener habilitada la característica para listar o abrir sus contenidos independientes y recursos.

#### Scenario: Estudiante matriculado
- **WHEN** un estudiante matriculado abre la sección “Contenidos” de un curso habilitado
- **THEN** ve los contenidos inmediatamente después de su creación
- **AND** los ve en el orden manual persistido

#### Scenario: Acceso por URL sin habilitación
- **WHEN** un estudiante intenta abrir directamente un contenido cuyo curso tiene la característica deshabilitada
- **THEN** el sistema no expone el contenido ni sus recursos

#### Scenario: Estudiante no matriculado
- **WHEN** un estudiante no matriculado intenta listar o abrir contenidos de un curso
- **THEN** el sistema rechaza el acceso y no devuelve datos del contenido

### Requirement: Sección independiente de la organización semanal
Los contenidos independientes MUST mostrarse en una sección propia y MUST NOT relacionarse, agruparse ni condicionar su visibilidad a semanas del curso.

#### Scenario: Curso semanal habilitado
- **WHEN** un curso con organización semanal tiene habilitados los contenidos independientes
- **THEN** docentes y estudiantes acceden a “Contenidos” fuera de las semanas
- **AND** la publicación o visibilidad de una semana no altera esos contenidos

### Requirement: Conservación al deshabilitar
Deshabilitar la característica MUST ocultar y bloquear los contenidos del curso sin eliminar sus registros, recursos ni orden.

#### Scenario: Deshabilitación con contenidos existentes
- **WHEN** un administrador deshabilita la característica en un curso que ya tiene contenidos
- **THEN** los contenidos dejan de aparecer y de ser accesibles para docentes y estudiantes
- **AND** sus datos permanecen almacenados

#### Scenario: Reactivación posterior
- **WHEN** un administrador vuelve a habilitar la característica
- **THEN** reaparecen los contenidos, recursos y orden existentes sin recrearlos
