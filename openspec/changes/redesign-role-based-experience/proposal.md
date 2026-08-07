## Why

La aplicación resuelve los flujos principales, pero la experiencia varía considerablemente entre administración, docencia y estudio: el área administrativa conserva patrones visuales genéricos, mientras los otros portales duplican navegación, presentan jerarquías extensas y no siempre priorizan la próxima acción. Unificar la experiencia ahora permitirá incorporar más cursos sin aumentar la fricción operativa ni la carga de aprendizaje.

## What Changes

- Crear un sistema de diseño Epixum accesible con tokens, componentes compartidos, estados, densidades y reglas responsive para todo el producto.
- Reemplazar las cabeceras fragmentadas por una estructura de aplicación común que adapte navegación, accesos rápidos y contexto al rol activo.
- Incorporar portadas orientadas a tareas: panorama operativo para administración, seguimiento y pendientes para docentes, y continuidad de aprendizaje para estudiantes.
- Mejorar las listas de cursos, usuarios, clases, trabajos y consultas con búsqueda, filtros, orden, conteos y estados vacíos accionables.
- Organizar cada curso mediante navegación contextual estable, jerarquía clara, migas de pan y acciones primarias predecibles.
- Estandarizar formularios, validaciones, confirmaciones, carga, éxito y error, evitando `alert` y `confirm` nativos.
- Hacer que la experiencia sea usable con teclado, lector de pantalla, zoom y preferencias de movimiento reducido, con contraste verificable.
- Mantener los permisos, rutas, reglas de PocketBase y flujos funcionales actuales; el cambio no modifica el modelo de datos por defecto.

## Capabilities

### New Capabilities

- `design-system-and-accessibility`: Sistema visual compartido, componentes de interfaz, accesibilidad, feedback, responsive y movimiento.

### Modified Capabilities

- `application-shell-and-navigation`: Unificar la estructura de navegación, incorporar portadas por rol y navegación contextual de curso.
- `course-management-and-enrollment`: Mejorar descubrimiento, lectura y gestión de cursos, así como la experiencia de matrícula por clave.
- `user-management-and-profile`: Mejorar la gestión administrativa de usuarios y la edición del perfil personal.
- `assignments-deliveries-and-evaluation`: Priorizar estados, fechas, entregas pendientes y acciones de evaluación para estudiantes y docentes.
- `inquiries-and-discussion`: Mejorar el seguimiento visual de consultas, respuestas y estados de atención.

## Impact

- Afecta layouts y páginas de `app/admin`, `app/docentes`, `app/estudiantes`, login, perfil y componentes compartidos.
- Requiere extraer primitivas UI reutilizables y consolidar estilos actualmente distribuidos en clases Tailwind de cada pantalla.
- Puede requerir consultas agregadas o paralelas para resúmenes y conteos, pero no exige una migración de PocketBase; si durante la implementación se detecta que un indicador necesita persistencia nueva, se propondrá por separado.
- Conserva URLs públicas internas, autenticación, autorización, matrículas, almacenamiento y contratos de acciones de servidor.
- La entrega se plantea por capas para reducir riesgo: fundamentos, shell común, experiencias por rol y endurecimiento de accesibilidad.
