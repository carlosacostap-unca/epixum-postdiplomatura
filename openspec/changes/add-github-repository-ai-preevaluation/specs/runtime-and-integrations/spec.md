## MODIFIED Requirements

### Requirement: Configuración por entorno
La aplicación MUST obtener endpoints y credenciales de PocketBase, iDrive, OpenAI, GitHub y el secreto de matrículas mediante variables de entorno. Las credenciales de GitHub MUST limitarse a lectura y MUST ser opcionales únicamente cuando se consulten recursos públicos dentro del límite no autenticado.

#### Scenario: Código cliente
- **WHEN** una variable necesita exponerse al navegador
- **THEN** solamente se utiliza una variable explícitamente pública como `NEXT_PUBLIC_POCKETBASE_URL`

#### Scenario: Credenciales privadas
- **WHEN** una integración requiere contraseña, access key, API key, token o secreto
- **THEN** el valor se usa únicamente en módulos del servidor o herramientas locales
- **AND** MUST NOT serializarse hacia componentes cliente, respuestas ni logs

#### Scenario: Token GitHub ausente
- **WHEN** no se configura un token y GitHub permite consultar el repositorio público dentro de su límite no autenticado
- **THEN** la integración puede continuar sin ampliar permisos

#### Scenario: Integración obligatoria ausente
- **WHEN** falta `OPENAI_API_KEY` al solicitar una preevaluación
- **THEN** el sistema informa que la integración no está configurada
- **AND** no crea una evaluación ni intenta una llamada sin credenciales

## ADDED Requirements

### Requirement: Fallos y límites de proveedores
Las integraciones con GitHub y OpenAI MUST aplicar tiempos máximos, interpretar límites y errores sin reintentos agresivos, y devolver categorías sanitizadas que permitan distinguir configuración, disponibilidad, límite, repositorio inválido y respuesta no utilizable.

#### Scenario: Límite de GitHub
- **WHEN** GitHub informa que se agotó el límite de solicitudes
- **THEN** el intento finaliza de manera controlada o espera según la política del servidor
- **AND** la interfaz orienta a reintentar sin revelar encabezados o tokens sensibles

#### Scenario: Error transitorio de OpenAI
- **WHEN** OpenAI responde con un error transitorio
- **THEN** el servidor aplica una cantidad acotada de reintentos con espera incremental
- **AND** si no se recupera, marca el intento como fallido sin modificar la evaluación oficial
