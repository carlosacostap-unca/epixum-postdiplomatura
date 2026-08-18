## ADDED Requirements

### Requirement: Entrega mediante URL
El sistema MUST permitir que un estudiante matriculado cree o actualice su entrega antes del vencimiento eligiendo exactamente una modalidad: uno o más archivos, o una URL absoluta con esquema HTTP o HTTPS. El estudiante propietario, los docentes responsables del curso y los administradores MUST poder consultar la modalidad y abrir la URL entregada cuando corresponda.

#### Scenario: Nueva entrega mediante URL válida
- **WHEN** un estudiante matriculado informa una URL HTTP o HTTPS válida antes del vencimiento
- **THEN** el sistema registra una única entrega asociada al estudiante y al trabajo
- **AND** conserva la URL sin intentar subir archivos

#### Scenario: URL inválida
- **WHEN** un estudiante intenta entregar un valor que no es una URL absoluta HTTP o HTTPS
- **THEN** la interfaz informa el error
- **AND** la acción del servidor rechaza igualmente la entrega

#### Scenario: Modalidades excluyentes
- **WHEN** el estudiante elige la modalidad de archivos
- **THEN** el sistema MUST exigir al menos un archivo y MUST NOT exigir una URL
- **AND** cuando elige la modalidad de URL, MUST exigir una URL y MUST NOT exigir archivos

#### Scenario: Cambio de modalidad
- **WHEN** el estudiante actualiza una entrega vigente y elige la otra modalidad
- **THEN** el sistema reemplaza la referencia anterior por la nueva modalidad
- **AND** mantiene el mismo registro de entrega

#### Scenario: Consulta de URL entregada
- **WHEN** el estudiante propietario, un docente responsable del curso o un administrador consulta una entrega por URL
- **THEN** la interfaz identifica que se trata de un enlace y permite abrirlo en una pestaña nueva
- **AND** aplica protección contra acceso de la página externa al contexto de navegación original

#### Scenario: Acceso no autorizado
- **WHEN** una persona sin propiedad ni permisos sobre el curso intenta consultar o modificar la entrega
- **THEN** el sistema MUST rechazar el acceso
