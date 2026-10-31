## Context

Los componentes de formularios, tablas y evaluaciones se comparten entre roles. Ver `proposal.md` para la motivación y el diseño minimalista aprobado en esta conversación.

## Goals / Non-Goals

**Goals:** aplicar la densidad aprobada a todas las rutas administrativas, conservar los componentes de negocio y evitar encabezados y navegación repetidos.

**Non-Goals:** modificar contratos de acciones, autenticación, permisos, esquemas o datos de producción; reproducir operaciones simuladas del prototipo.

## Decisions

- Rama administrativa explícita en el shell compartido, con cabecera breve y una rejilla para navegación global, navegación del curso y contenido. Los demás roles usan el shell anterior. La rejilla distribuye los layouts anidados sin portales ni sincronización de estado con efectos.
- Estilos administrativos con raíz `.admin-workspace` y marcadores estables en los componentes UI. Permiten conservar las acciones existentes y aplicar densidad uniforme incluso a detalles y diálogos, sin cambiar los estilos por defecto de los componentes compartidos.
- Navegación contextual con enlaces agrupados en escritorio y selector móvil; las herramientas opcionales respetan las banderas actuales del curso.
- Secciones del formulario permanecen montadas al cambiar de pestaña para que `FormData` incluya todos los campos y los controles no pierdan valores. Se conserva el editor enriquecido y el tratamiento actual de errores y envíos.
- La portada consume las consultas existentes y deriva los indicadores de datos reales. La reducción de densidad prioriza espaciados y estructura sobre reducir la legibilidad.

## Risks / Trade-offs

- Selectores CSS amplios podrían afectar herramientas compartidas → usar raíz de admin y marcadores semánticos; verificar los demás roles.
- Campos ocultos obligatorios podrían bloquear el envío sin poder enfocarse → la información obligatoria permanece visible o se abre automáticamente su sección ante un error de validación.
- Navegación anidada mediante `display: contents` → conservar los landmarks y verificar dimensiones y navegación en escritorio y móvil.
- Formularios y rutas dependen de PocketBase → usar datos de prueba locales para verificación visual; no escribir en producción durante las comprobaciones.

## Migration Plan

Sin migraciones. Se despliega como cambio de interfaz y se puede revertir restituyendo los componentes y la hoja de estilos del admin.
