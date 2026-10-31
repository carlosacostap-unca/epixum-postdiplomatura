## ADDED Requirements

### Requirement: Administración compacta
El espacio administrativo MUST presentar encabezados, controles y listas compactos, conservar todas las acciones existentes y MUST NOT modificar la presentación de otros roles. Solamente los administradores autorizados MUST poder acceder a este espacio.

#### Scenario: Inicio administrativo
- **WHEN** un administrador abre el inicio
- **THEN** ve los indicadores en una franja, los cursos pendientes de configuración y los cursos en curso
- **AND** puede acceder al catálogo, usuarios, perfil, cambio de espacio autorizado y cierre de sesión

#### Scenario: Navegación contextual agrupada
- **WHEN** un administrador abre un curso
- **THEN** dispone de Gestión, Evaluación y Seguimiento con los destinos habilitados para ese curso
- **AND** la sección activa se identifica también en sus rutas de detalle
- **AND** la navegación móvil ofrece los mismos destinos mediante un selector accesible

#### Scenario: Configuración y operaciones existentes
- **WHEN** un administrador edita un curso o gestiona participantes, bedeles, acceso, evaluaciones o seguimiento
- **THEN** conserva los datos, validaciones, confirmaciones y operaciones anteriores
- **AND** la configuración organiza sus campos en secciones sin descartar los valores de otras secciones al guardar

#### Scenario: Accesibilidad y aislamiento
- **WHEN** se usa el panel en móvil o mediante teclado
- **THEN** todas las acciones esenciales son accesibles y los objetivos táctiles mantienen al menos 44 píxeles
- **AND** las pantallas de docencia, estudio y bedelía conservan sus estilos actuales
