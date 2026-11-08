## Why

Las vistas del estudiante requieren demasiado recorrido vertical para retomar una actividad, encontrar sus cursos y consultar las entregas. Se implementan los dos diseños aprobados, usando datos reales y conservando las operaciones y restricciones actuales.

## What Changes

- Shell compacto del espacio de estudio con navegación global y contextual de curso.
- Inicio con indicadores en una franja, próxima actividad e invitaciones, cursos en lista y pendientes en un lateral.
- Resumen de curso con próximo paso, unidades desplegables y filas de clases y trabajos; soporte equivalente para cursos tradicionales.
- Onboarding compacto y desplegable, conservando sus requisitos; resultado de cursada y accesos a herramientas habilitadas.
- Adaptación móvil, estados vacíos, filtros, teclado y enlaces existentes.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `application-shell-and-navigation`: composición compacta de las portadas del estudiante y navegación contextual que conserva las funciones y sus permisos.

## Impact

Páginas de inicio y resumen de curso en `app/estudiantes`, shell estudiantil, presentación de invitaciones y onboarding. No se modifican contratos de acciones, autenticación, matrículas, permisos, plazos de entrega ni esquemas de PocketBase. Los estilos se limitan al espacio de estudio y no requieren dependencias nuevas ni migraciones.
