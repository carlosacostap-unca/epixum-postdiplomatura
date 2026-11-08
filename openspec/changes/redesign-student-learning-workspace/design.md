## Context

Ver los dos diseños aprobados en esta conversación y `proposal.md`. Las páginas existentes calculan visibilidad, matrícula, próximas actividades y estados de entrega en el servidor. Sus acciones y componentes también se usan desde otras rutas.

## Goals / Non-Goals

**Goals:** reproducir la jerarquía y densidad de los diseños con datos reales, respetando organización tradicional y por unidades, invitaciones, entregas tardías y herramientas opcionales.

**Non-Goals:** modificar persistencia, autorizaciones, selección temporal de la próxima actividad o contratos de acciones; implementar nuevos estados de avance.

## Decisions

- Shell estudiantil independiente, elegido por el espacio activo desde AppShell; estilos bajo `.student-workspace`. La grilla permite que la navegación del resumen de curso comparta el lateral sin portales ni llamadas de cliente adicionales. El salto de contenido enfoca un contenedor real, ya que `display: contents` no admite foco.
- Mantener los loaders, comprobaciones de sesión y matrícula y algoritmos de publicación actuales. Reutilizar el mismo conjunto de destinos de curso en la navegación contextual y las pestañas existentes de páginas de detalle.
- Separar las vistas de presentación de los loaders para probar cursos, filtros, estados de entrega y unidades ocultas con fixtures locales. No sumar consultas ni inventar nombres de profesores o simulaciones cuando no están disponibles.
- Variante compacta opcional de invitaciones y onboarding. Las acciones, errores, bloqueos, requisitos y resultados se conservan; las variantes por defecto mantienen su contrato y uso actual.
- No agregar un layout con nuevas comprobaciones de matrícula al grupo entero de rutas: el onboarding de invitados tiene un acceso legítimo anterior a la matrícula.

## Risks / Trade-offs

- Perder estados de entrega o contenido al cambiar la composición → reutilizar la presentación actual de entregas y probar variantes vencidas, corregidas y tardías.
- Ocultar requisitos o invitaciones por reducir espacio → mostrar todas las invitaciones; onboarding pendiente visible y requisitos completos desplegables.
- Regresiones en roles compartidos → componentes nuevos y estilos acotados; comprobar AppShell y navegación existentes.
- Diferencias entre los ejemplos gráficos y los datos reales → usar solamente información disponible y accesos genéricos a simulaciones y consultas, sin métricas inventadas.

## Migration Plan

Sin migraciones ni dependencias nuevas. Verificación con datos ficticios locales de solo lectura y compilación de producción. Reversión mediante los componentes y estilos de este cambio.
