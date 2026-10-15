## Why

El cierre obligatorio al vencer obliga a extender continuamente las fechas. Se necesita aceptar entregas tardías por decisión docente sin perder la referencia al plazo original.

## What Changes

- Casilla por trabajo, disponible en todos los cursos: permitir entregas fuera de término, desactivada por defecto.
- Aplicar la política en formularios y servidor para archivos/enlaces y sus actualizaciones, manteniendo la excepción de corrección solicitada y el cierre de aprobados.
- Registrar el vencimiento y condición tardía al guardar cada versión; mostrar etiqueta docente sin alterar notas ni evaluaciones.
- Migración aditiva e idempotente sin cambiar fechas, habilitar opciones masivamente ni reescribir entregas históricas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `assignments-deliveries-and-evaluation`: política configurable de vencimiento y señalización informativa de entregas tardías.

## Impact

PocketBase assignments/deliveries, tipos, acciones de creación/edición/entrega, flujo versionado y vistas de estudiante/docente. Se conserva autorización y alcance de curso, publicación e historial. No requiere proveedores externos nuevos; no envía correos ni cambia rúbricas o calificaciones.
