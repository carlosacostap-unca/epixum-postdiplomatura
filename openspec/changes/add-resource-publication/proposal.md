## Why

Los docentes necesitan preparar recursos de clases y trabajos prácticos sin exponerlos inmediatamente a los estudiantes. Cada recurso debe poder publicarse cuando esté listo y volver a borrador.

## What Changes

- Agregar también Borrador / Publicado al trabajo práctico completo; un trabajo en borrador oculta su consigna y todos sus recursos e impide entregas.
- Agregar estado Borrador / Publicado a enlaces y archivos de clases y trabajos prácticos.
- Crear estos recursos en borrador por defecto y permitir cambiar el estado al editarlos.
- Impedir a estudiantes listar, consultar o generar descargas de recursos en borrador.
- Mantener publicados los recursos existentes y preservar el acceso de supervisión de bedeles asignados.
- Conservar sin cambios los recursos independientes del curso.

## Capabilities

### New Capabilities
- `resource-publication`: publicación individual de recursos de clases y trabajos prácticos con autorización en servidor y base de datos.

### Modified Capabilities

Ninguna.

## Impact

Colección PocketBase `links`, reglas compartidas de recursos, acciones de creación/edición/descarga, formularios y listados docentes. Campo opcional compatible con recursos existentes; migración idempotente con respaldo previo y pruebas de permisos. También cambia la colección `assignments` y los permisos de entrega; no modifica el estado de las clases.
