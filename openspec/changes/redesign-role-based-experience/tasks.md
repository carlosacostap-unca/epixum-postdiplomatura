## 1. Auditoría y fundamentos visuales

- [x] 1.1 Inventariar todas las rutas autenticadas por rol, sus acciones primarias, estados vacíos, errores y patrones duplicados, y registrar una matriz de cobertura.
- [x] 1.2 Reorganizar los tokens globales de color, superficie, texto, borde, estado, espaciado, radio, sombra y movimiento conservando la identidad Epixum.
- [x] 1.3 Validar contraste WCAG 2.2 AA para texto, controles, foco y estados sobre cada superficie utilizada.
- [x] 1.4 Añadir estilos globales de foco visible, objetivos táctiles y `prefers-reduced-motion` sin alterar el orden semántico del contenido.

## 2. Componentes compartidos y feedback

- [x] 2.1 Implementar las primitivas `Button`, `IconButton`, `Badge`, `Card`, `Field` y `Select` con variantes accesibles y estados pending/disabled.
- [x] 2.2 Implementar `Dialog` accesible con gestión de foco, cierre por teclado, etiquetado y retorno al control de origen.
- [x] 2.3 Implementar una región compartida de avisos para éxito y error, con mensajes persistentes en contexto cuando requieran corrección.
- [x] 2.4 Implementar `EmptyState`, `Skeleton`, `PageHeader`, `Breadcrumbs`, `Tabs` y `StatCard` con comportamiento responsive.
- [x] 2.5 Implementar `DataList` y `DataTable` con alternativa móvil que conserve campos y acciones esenciales.
- [x] 2.6 Crear pruebas de interacción para teclado, foco, nombres accesibles, diálogos y anuncios de los componentes compartidos.

## 3. Shell y navegación por rol

- [x] 3.1 Definir una configuración tipada de destinos, etiquetas, iconos y acciones permitidas para admin, docente y estudiante.
- [x] 3.2 Implementar el shell compartido de escritorio con navegación activa, perfil, cierre de sesión y área principal con salto al contenido.
- [x] 3.3 Implementar encabezado y navegación móvil equivalentes sin ocultar capacidades del rol.
- [x] 3.4 Migrar los layouts de administración, docencia y estudio al shell compartido manteniendo todas las validaciones de servidor.
- [x] 3.5 Consolidar la edición de perfil dentro del shell, con validación por campo, confirmación y adaptación móvil.
- [x] 3.6 Verificar que las rutas actuales, redirecciones por rol y cierre de sesión funcionan sin destellos ni enlaces no autorizados.

## 4. Experiencia administrativa

- [x] 4.1 Crear la portada administrativa con indicadores accionables de cursos y usuarios obtenidos desde datos vigentes.
- [x] 4.2 Rediseñar la gestión de cursos con búsqueda, filtros, orden, conteo y parámetros de consulta persistentes.
- [x] 4.3 Adaptar la gestión de cursos a móvil conservando edición, estado, fechas y docente asociado.
- [x] 4.4 Normalizar crear, editar y eliminar cursos con componentes compartidos, validación en contexto y diálogo destructivo.
- [x] 4.5 Rediseñar la gestión de usuarios con búsqueda por identidad, filtro de rol, conteo y presentación responsive.
- [x] 4.6 Incorporar confirmación contextual y feedback accesible al cambiar privilegios de un usuario.
- [x] 4.7 Añadir pruebas de autorización y recorridos administrativos para portada, filtros, cursos y roles.

## 5. Experiencia docente

- [x] 5.1 Implementar consultas de portada docente para cursos, entregas sin evaluación publicada y consultas pendientes, limitando resultados.
- [x] 5.2 Rediseñar la portada docente con pendientes ordenados, estado al día y accesos directos a su contexto.
- [x] 5.3 Crear el encabezado y las pestañas contextuales de curso para resumen, clases, trabajos, consultas, estudiantes y acceso.
- [x] 5.4 Migrar la gestión de clases y recursos al nuevo contexto con acciones primarias predecibles y estados vacíos accionables.
- [x] 5.5 Migrar la gestión de trabajos y entregas con búsqueda, filtros de revisión, conteos y estados semánticos.
- [x] 5.6 Diferenciar guardar borrador de publicar evaluación mediante jerarquía, confirmación y feedback de visibilidad.
- [x] 5.7 Rediseñar consultas docentes con filtros por estado, orden por atención y acceso directo desde la portada.
- [x] 5.8 Integrar estudiantes y clave de matrícula en secciones contextuales sin exponer el hash ni alterar permisos.
- [x] 5.9 Añadir pruebas de alcance para asegurar que cada docente solo visualiza y gestiona sus cursos y pendientes.

## 6. Experiencia del estudiante

- [x] 6.1 Implementar consultas de portada para próxima clase, trabajos vigentes sin entrega y consultas propias pendientes.
- [x] 6.2 Rediseñar la portada estudiante para priorizar Continuar aprendiendo, próximos vencimientos, consultas y matrícula.
- [x] 6.3 Mejorar Mis cursos con búsqueda, filtro por estado y tarjetas que comuniquen próxima actividad sin mostrar cursos no matriculados.
- [x] 6.4 Convertir Sumarse a un curso en un diálogo accesible con validación en contexto, confirmación del curso y acceso inmediato.
- [x] 6.5 Aplicar el encabezado y las pestañas contextuales al curso del estudiante, priorizando su próxima acción.
- [x] 6.6 Rediseñar clases, recursos y trabajos con estado temporal, entrega existente, progreso de archivo y errores recuperables.
- [x] 6.7 Rediseñar consultas del estudiante para retomar conversaciones propias y distinguir estado sin depender del color.
- [x] 6.8 Añadir pruebas que confirmen acceso exclusivo a cursos matriculados, matrícula inmediata y bloqueo después del vencimiento.

## 7. Consolidación y calidad

- [x] 7.1 Reemplazar todos los usos de `alert` y `confirm` nativos en rutas autenticadas por feedback y diálogos compartidos.
- [x] 7.2 Completar estados skeleton, vacío, error y reintento para cada consulta o mutación visible de los tres roles.
- [x] 7.3 Eliminar layouts, estilos y componentes duplicados únicamente después de migrar y comprobar sus consumidores.
- [x] 7.4 Ejecutar build, lint y pruebas automatizadas de los recorridos críticos para admin, docente y estudiante.
- [x] 7.5 Verificar manualmente teclado, foco, lector de pantalla, zoom al 200 por ciento, 320 píxeles de ancho y movimiento reducido.
- [x] 7.6 Comparar tiempos de carga y cantidad de consultas de las nuevas portadas, y optimizar cualquier regresión observable antes de publicar.
- [x] 7.7 Documentar los componentes compartidos, reglas de composición y criterios de aceptación para futuras pantallas.
