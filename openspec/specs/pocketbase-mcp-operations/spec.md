# Operaciones de PocketBase mediante MCP

## Purpose
Definir el servidor MCP local que permite a Codex inspeccionar y administrar exclusivamente el PocketBase de este proyecto con controles de seguridad.

## Requirements

### Requirement: Servidor MCP local por stdio
El proyecto MUST proporcionar un servidor MCP ejecutable por Node.js y registrado en `.codex/config.toml` con transporte `stdio`.

#### Scenario: Inicio desde Codex
- **WHEN** Codex abre el repositorio y carga su configuración local
- **THEN** inicia `tools/pocketbase-mcp/server.mjs`
- **AND** recibe el catálogo de herramientas mediante el protocolo MCP

### Requirement: Credenciales del proyecto
El MCP MUST cargar el endpoint y credenciales administrativas desde `.env.local` y MUST validar que pertenecen a un superusuario.

#### Scenario: Conexión correcta
- **WHEN** se invoca `pocketbase_health`
- **THEN** la herramienta verifica salud, autenticación y endpoint
- **AND** devuelve solamente metadatos sanitizados

#### Scenario: Variables ausentes
- **WHEN** falta URL, email o contraseña
- **THEN** el servidor falla con los nombres de variables faltantes sin revelar valores

### Requirement: Herramientas de lectura
El MCP MUST ofrecer salud, identidad, listado y detalle de colecciones, listado y detalle de registros, y validación del esquema de Epixum.

#### Scenario: Inspección de esquema
- **WHEN** Codex solicita validar Epixum
- **THEN** recibe colecciones o campos faltantes y el estado del flujo de matrículas

### Requirement: Herramientas de escritura controlada
El MCP MUST ofrecer creación, actualización y eliminación de registros y colecciones, y Codex MUST solicitar aprobación para cada herramienta de escritura.

#### Scenario: Actualización de colección
- **WHEN** Codex propone cambiar reglas o campos
- **THEN** la aplicación solicita aprobación antes de ejecutar la herramienta

#### Scenario: Eliminación
- **WHEN** se propone eliminar un registro o colección
- **THEN** la herramienta se identifica como destructiva y requiere aprobación explícita

### Requirement: Límites y sanitización
El MCP MUST bloquear colecciones internas, limitar consultas a 100 registros, limitar entradas y salidas JSON a 100 KB y ocultar claves sensibles.

#### Scenario: Colección interna
- **WHEN** una herramienta recibe `_superusers` u otro nombre con prefijo `_`
- **THEN** rechaza la operación

#### Scenario: Respuesta con secretos
- **WHEN** PocketBase devuelve una estructura con claves sensibles
- **THEN** el MCP sustituye sus valores por `[REDACTED]`

### Requirement: Verificación automatizada
El proyecto MUST incluir pruebas unitarias del perímetro de seguridad y una prueba smoke de protocolo, autenticación y esquema real.

#### Scenario: Validación local
- **WHEN** se ejecuta `npm run mcp:pocketbase:test`
- **THEN** se prueban nombres permitidos, sanitización, límites y errores

#### Scenario: Validación real
- **WHEN** se ejecuta `npm run mcp:pocketbase:smoke` con red disponible
- **THEN** se negocia MCP, autentica PocketBase y valida el esquema sin modificar datos
