# Experiencia y navegación de la aplicación

## Purpose
Definir la identidad visual Epixum, la estructura responsive y los puntos de navegación comunes a cada rol.

## Requirements

### Requirement: Identidad Epixum
La aplicación MUST usar “Epixum” como nombre visible y MUST NOT presentar la denominación anterior “Epixum PostDiplomatura”.

#### Scenario: Pantalla de acceso y cabeceras
- **WHEN** se renderiza el login o una cabecera principal
- **THEN** el producto se identifica como “Epixum”

### Requirement: Navegación específica por rol
Cada panel MUST ofrecer únicamente los accesos principales relevantes para su rol.

#### Scenario: Estudiante
- **WHEN** un estudiante navega por la aplicación
- **THEN** dispone de “Mis cursos”, perfil y cierre de sesión

#### Scenario: Docente
- **WHEN** un docente navega por su panel
- **THEN** dispone de cursos, clases, perfil y cierre de sesión

#### Scenario: Administrador
- **WHEN** un administrador usa la cabecera administrativa
- **THEN** dispone de usuarios y cursos

### Requirement: Interfaz responsive
Los layouts MUST conservar navegación y acciones esenciales en escritorio y dispositivos móviles.

#### Scenario: Pantalla móvil
- **WHEN** el ancho no permite la navegación horizontal completa
- **THEN** las áreas docente y estudiante muestran una navegación móvil equivalente

### Requirement: Estados de interfaz
Las operaciones asíncronas MUST comunicar carga, éxito, ausencia de datos y error sin requerir recargar manualmente la página.

#### Scenario: Operación en curso
- **WHEN** el usuario envía un formulario o archivo
- **THEN** el control evita envíos repetidos y muestra un estado de progreso

#### Scenario: Operación completada
- **WHEN** una acción modifica datos correctamente
- **THEN** las rutas afectadas se revalidan y la vista refleja el nuevo estado
