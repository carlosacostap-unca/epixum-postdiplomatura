## ADDED Requirements

### Requirement: Orientación para ingresar con correos no-Gmail
La pantalla pública de acceso MUST informar que una dirección Hotmail, Yahoo o de otro proveedor puede utilizarse con “Continuar con Google” cuando está asociada a una Cuenta de Google, y MUST orientar a la persona sin incorporar un mecanismo de autenticación alternativo.

#### Scenario: Persona invitada con correo no-Gmail
- **WHEN** una persona abre `/login` antes de autenticarse
- **THEN** ve que no necesita cambiar su dirección invitada por una dirección `@gmail.com`
- **AND** puede acceder a una guía oficial para crear una Cuenta de Google con su correo existente

#### Scenario: Selección de la identidad invitada
- **WHEN** una persona posee varias Cuentas de Google o utiliza un correo alternativo
- **THEN** la pantalla le indica que debe elegir exactamente la cuenta cuyo email fue autorizado

#### Scenario: Invitación ausente después del ingreso
- **WHEN** la persona completa el ingreso pero no encuentra su invitación
- **THEN** la orientación le indica contactar a la administración para revisar el email autorizado

#### Scenario: Compatibilidad del acceso existente
- **WHEN** una persona utiliza una dirección Gmail o una Cuenta de Google ya configurada
- **THEN** mantiene el mismo flujo de Google OAuth sin pasos obligatorios adicionales
