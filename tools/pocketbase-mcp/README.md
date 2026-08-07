# PocketBase MCP de Epixum

Servidor MCP local por `stdio` para administrar el PocketBase exclusivo de este proyecto.

## Credenciales

El servidor carga directamente `.env.local` desde la raíz y requiere:

- `NEXT_PUBLIC_POCKETBASE_URL`
- `POCKETBASE_ADMIN_EMAIL`
- `POCKETBASE_ADMIN_PASSWORD`

Las credenciales no se copian a la configuración de Codex ni se incluyen en las respuestas.

## Seguridad

- Las colecciones internas de PocketBase están bloqueadas.
- Las respuestas y escrituras JSON se limitan a 100 KB.
- Las consultas paginadas permiten como máximo 100 registros.
- Las escrituras, eliminaciones y modificaciones de esquema requieren aprobación de Codex.
- Los campos con nombres sensibles se ocultan de las respuestas.

## Comandos

```powershell
npm.cmd run mcp:pocketbase:test
npm.cmd run mcp:pocketbase:smoke
npm.cmd run mcp:pocketbase
```

Codex registra el servidor mediante `.codex/config.toml`. Después de modificar esa configuración,
reinicia Codex o vuelve a abrir el proyecto para cargar las herramientas MCP.
