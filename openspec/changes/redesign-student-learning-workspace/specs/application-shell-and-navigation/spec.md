## ADDED Requirements

### Requirement: Espacio estudiantil compacto
El espacio de estudio MUST presentar el inicio y el resumen de cada curso con composición compacta, conservar las operaciones y restricciones actuales y MUST NOT mostrar datos de ejemplo, porcentajes de progreso inventados ni acciones administrativas.

#### Scenario: Inicio del estudiante
- **WHEN** una persona autenticada abre su espacio de estudio
- **THEN** puede retomar su próxima actividad, buscar y filtrar sus matrículas, consultar entregas y consultas pendientes, sumarse por clave y activar todas sus invitaciones
- **AND** las invitaciones pendientes permanecen separadas de las matrículas vigentes

#### Scenario: Resumen de un curso por unidades
- **WHEN** una persona matriculada abre un curso organizado por unidades
- **THEN** ve únicamente unidades y contenidos publicados, con clases, trabajos y estados de entrega en filas compactas
- **AND** puede desplegar unidades y consultar su contenido y sus conversaciones desde los destinos existentes

#### Scenario: Curso tradicional y herramientas opcionales
- **WHEN** se abre un curso tradicional o se configuran herramientas opcionales
- **THEN** conserva las secciones de clases y trabajos y solamente ofrece las herramientas habilitadas
- **AND** el onboarding, sus requisitos y el resultado publicado individual siguen accesibles

#### Scenario: Accesibilidad, privacidad y aislamiento
- **WHEN** se usa el espacio de estudio en móvil o con teclado
- **THEN** la navegación, las acciones y los estados siguen siendo accesibles y los controles táctiles mantienen 44 píxeles
- **AND** una persona sin matrícula sigue siendo rechazada por las comprobaciones existentes
- **AND** los espacios de administración, docencia y bedelía conservan su presentación
