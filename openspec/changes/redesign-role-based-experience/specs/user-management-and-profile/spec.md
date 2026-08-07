## MODIFIED Requirements

### Requirement: Perfil personal editable
El sistema MUST permitir que un usuario autenticado consulte y actualice su propio nombre, apellido, DNI, fecha de nacimiento y teléfono mediante un formulario accesible que comunique validación y resultado.

#### Scenario: Actualización propia
- **WHEN** el usuario guarda campos válidos en su perfil
- **THEN** PocketBase actualiza solamente su registro
- **AND** la interfaz confirma el cambio y revalida los lugares donde aparece su identidad

#### Scenario: Datos inválidos
- **WHEN** uno o más campos no cumplen su formato
- **THEN** el formulario conserva los valores y relaciona cada error con su campo

#### Scenario: Edición de otra persona
- **WHEN** un usuario no administrador intenta modificar un ID ajeno
- **THEN** el sistema rechaza la operación

### Requirement: Gestión administrativa de roles
Solo un administrador MUST poder cambiar el rol de otro usuario entre `admin`, `docente` y `estudiante`, y la interfaz MUST permitir localizar usuarios y confirmar cambios de privilegios con contexto suficiente.

#### Scenario: Búsqueda y filtrado
- **WHEN** un administrador busca por nombre o correo, o filtra por rol
- **THEN** la lista muestra usuarios coincidentes y la cantidad de resultados

#### Scenario: Cambio autorizado
- **WHEN** un administrador selecciona y confirma un nuevo rol para un usuario identificado
- **THEN** PocketBase actualiza el usuario
- **AND** la lista administrativa comunica y refleja el nuevo rol

#### Scenario: Escalada de privilegios
- **WHEN** un usuario común intenta asignarse `docente` o `admin`
- **THEN** las acciones del servidor y las reglas de PocketBase rechazan el cambio

## ADDED Requirements

### Requirement: Listas administrativas adaptables
Las listas de usuarios MUST conservar datos y acciones esenciales al pasar de escritorio a móvil, sin exigir desplazamiento horizontal de página.

#### Scenario: Usuario administra desde móvil
- **WHEN** el ancho no permite una tabla completa
- **THEN** cada usuario se presenta como una unidad legible con identidad, correo, rol y acción permitida
