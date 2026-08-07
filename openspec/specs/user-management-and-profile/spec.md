# Usuarios y perfiles

## Purpose
Definir el perfil personal, la identidad visible y la administración segura de roles.

## Requirements

### Requirement: Perfil personal editable
El sistema MUST permitir que un usuario autenticado actualice su propio nombre, apellido, DNI, fecha de nacimiento y teléfono.

#### Scenario: Actualización propia
- **WHEN** el usuario guarda campos válidos en su perfil
- **THEN** PocketBase actualiza solamente su registro
- **AND** la interfaz revalida el perfil y los lugares donde aparece su identidad

#### Scenario: Edición de otra persona
- **WHEN** un usuario no administrador intenta modificar un ID ajeno
- **THEN** el sistema rechaza la operación

### Requirement: Normalización de identidad
El sistema MUST sincronizar el campo `name` cuando existen nombre y apellido, y MUST almacenar las fechas sin desplazamientos involuntarios de zona horaria.

#### Scenario: Nombre completo
- **WHEN** se guardan `firstName` y `lastName`
- **THEN** `name` queda formado por ambos valores

#### Scenario: Fecha de nacimiento
- **WHEN** el formulario envía una fecha `YYYY-MM-DD`
- **THEN** el servidor la normaliza a una fecha ISO estable
- **AND** permite limpiar el valor mediante una entrada vacía

### Requirement: Identidad visual
El sistema MUST mostrar el avatar de PocketBase cuando existe y MUST ofrecer una representación alternativa basada en el nombre cuando no existe.

#### Scenario: Usuario sin avatar
- **WHEN** un usuario no tiene archivo de avatar
- **THEN** los paneles muestran iniciales o un avatar generado sin impedir la navegación

### Requirement: Gestión administrativa de roles
Solo un administrador MUST poder cambiar el rol de otro usuario entre `admin`, `docente` y `estudiante`.

#### Scenario: Cambio autorizado
- **WHEN** un administrador selecciona un nuevo rol
- **THEN** PocketBase actualiza el usuario
- **AND** la lista administrativa se revalida

#### Scenario: Escalada de privilegios
- **WHEN** un usuario común intenta asignarse `docente` o `admin`
- **THEN** las acciones del servidor y las reglas de PocketBase rechazan el cambio
