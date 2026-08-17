## MODIFIED Requirements

### Requirement: Recursos vinculados
Los docentes asignados MUST poder crear, actualizar y eliminar recursos de tipo `link` o `file`, asociados exclusivamente a una clase, un trabajo práctico o un contenido independiente de un curso que tengan permitido gestionar. Los administradores MUST conservar las operaciones sobre recursos de clases y trabajos prácticos admitidas actualmente.

#### Scenario: Enlace externo
- **WHEN** el docente guarda título, URL y padre válido
- **THEN** se crea un recurso navegable desde la clase, trabajo práctico o contenido correspondiente

#### Scenario: Archivo
- **WHEN** el docente carga un archivo
- **THEN** el sistema obtiene una URL prefirmada, almacena su referencia en `links` y permite una descarga autenticada

#### Scenario: Padre exclusivo
- **WHEN** se crea o actualiza un recurso
- **THEN** queda relacionado con exactamente una clase, trabajo práctico o contenido independiente
- **AND** el sistema rechaza padres múltiples o ausentes

#### Scenario: Contenido deshabilitado
- **WHEN** un usuario intenta abrir o descargar un recurso cuyo padre es un contenido de un curso con la característica deshabilitada
- **THEN** el sistema rechaza el acceso sin exponer la referencia almacenada
