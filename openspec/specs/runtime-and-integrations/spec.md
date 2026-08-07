# Runtime e integraciones

## Purpose
Definir el entorno de ejecución, configuración, caché y límites de integración de la aplicación Next.js.

## Requirements

### Requirement: Runtime soportado
El proyecto MUST ejecutarse sobre Node.js 20.9 o superior y MUST compilar con la versión de Next.js fijada en sus dependencias.

#### Scenario: Build de producción
- **WHEN** se ejecuta `npm run build` con variables requeridas
- **THEN** Next.js compila TypeScript, genera rutas y finaliza sin errores

### Requirement: Configuración por entorno
La aplicación MUST obtener endpoints y credenciales de PocketBase, iDrive, OpenAI y el secreto de matrículas mediante variables de entorno.

#### Scenario: Código cliente
- **WHEN** una variable necesita exponerse al navegador
- **THEN** solamente se utiliza una variable explícitamente pública como `NEXT_PUBLIC_POCKETBASE_URL`

#### Scenario: Credenciales privadas
- **WHEN** una integración requiere contraseña, access key o secreto
- **THEN** el valor se usa únicamente en módulos del servidor o herramientas locales

### Requirement: Renderizado y frescura de datos
Los paneles dependientes de sesión MUST renderizarse dinámicamente y las mutaciones MUST revalidar las rutas que consumen los datos modificados.

#### Scenario: Cambio de curso o contenido
- **WHEN** una acción crea, edita o elimina contenido
- **THEN** las páginas administrativas, docentes o estudiantiles afectadas reflejan el cambio

#### Scenario: Datos de usuarios cacheados
- **WHEN** se listan usuarios o estudiantes repetidamente
- **THEN** el servidor puede usar caché de corta duración etiquetada
- **AND** una actualización administrativa revalida la vista correspondiente

### Requirement: Compatibilidad OAuth en navegador
La aplicación MUST enviar `Cross-Origin-Opener-Policy: same-origin-allow-popups` para permitir el flujo emergente de Google OAuth.

#### Scenario: Ventana OAuth
- **WHEN** Google abre una ventana de autenticación
- **THEN** la política permite que el flujo se complete sin aislar indebidamente la ventana iniciadora

### Requirement: Sin envío de correos
La plataforma MUST NOT incluir rutas, botones, scripts, dependencias ni credenciales destinados al envío de correos electrónicos.

#### Scenario: Revisión del proyecto
- **WHEN** se inspeccionan dependencias y rutas operativas
- **THEN** no existe una funcionalidad para enviar o reenviar emails

### Requirement: Calidad mínima verificable
Los cambios MUST mantener compilación TypeScript y build de producción, y las herramientas auxiliares MUST conservar sus pruebas específicas.

#### Scenario: Entrega de un cambio
- **WHEN** se modifica una capacidad de la plataforma
- **THEN** se ejecuta validación proporcional que incluye al menos TypeScript o build y las pruebas relacionadas
