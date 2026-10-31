## Why

El administrador necesita consultar y gestionar más información sin recorrer encabezados, tarjetas y espacios verticales repetidos. Se implementa la propuesta minimalista aprobada, conservando todas las operaciones existentes.

## What Changes

- Shell administrativo compacto, con navegación contextual del curso agrupada en Gestión, Evaluación y Seguimiento.
- Inicio con indicadores en una franja, borradores pendientes y cursos activos.
- Tablas, filtros, formularios y encabezados compactos en todas las rutas administrativas, incluidos sus detalles.
- Configuración del curso organizada en secciones, conservando los campos, valores y acciones existentes.
- Navegación equivalente en móvil y áreas táctiles adecuadas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `application-shell-and-navigation`: presentación administrativa compacta y navegación contextual agrupada, sin alterar los demás espacios.

## Impact

Cambios en layouts y páginas de `app/admin`, shell, navegación contextual y estilos acotados al admin. No se modifican contratos de acciones, permisos, autenticación, datos ni esquemas de PocketBase. No se requieren dependencias nuevas ni migraciones.
