## MODIFIED Requirements

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
