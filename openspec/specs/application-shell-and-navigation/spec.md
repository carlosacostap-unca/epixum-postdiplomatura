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
Cada panel MUST ofrecer una estructura común con los accesos relevantes para el espacio activo, MUST señalar la ubicación actual, MUST mantener accesibles el perfil y el cierre de sesión y MUST permitir cambiar entre todos los espacios autorizados de la cuenta.

#### Scenario: Espacio de estudio
- **WHEN** una persona navega por el espacio de estudio
- **THEN** dispone de inicio, Mis cursos, perfil y cierre de sesión
- **AND** su portada prioriza continuar aprendiendo, próximos vencimientos y matrícula

#### Scenario: Espacio de docencia
- **WHEN** una persona con asignaciones docentes navega por el espacio de docencia
- **THEN** dispone de inicio, cursos, clases, perfil y cierre de sesión
- **AND** su portada prioriza entregas por revisar, consultas pendientes y gestión de contenido de sus cursos

#### Scenario: Espacio administrativo
- **WHEN** una persona con privilegio `admin` navega por el espacio administrativo
- **THEN** dispone de inicio, cursos, usuarios, perfil y cierre de sesión
- **AND** su portada resume el estado operativo de la plataforma

#### Scenario: Varios espacios disponibles
- **WHEN** la cuenta tiene acceso a más de uno de los espacios de administración, docencia o estudio
- **THEN** el shell identifica el espacio activo y ofrece un control accesible para cambiar a los demás
- **AND** el cambio conserva la misma sesión autenticada

#### Scenario: Espacio no disponible
- **WHEN** la cuenta no posee privilegio ni relación que habilite un espacio
- **THEN** el shell no ofrece ese destino
- **AND** una URL directa continúa siendo rechazada por el servidor

#### Scenario: Ubicación activa
- **WHEN** el usuario cambia de sección dentro de un espacio
- **THEN** la navegación identifica visual y semánticamente el destino actual

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
