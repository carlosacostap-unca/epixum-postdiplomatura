## Context

La interfaz actual combina un encabezado global para administración con dos layouts casi duplicados para docentes y estudiantes. El área administrativa usa tablas y estilos genéricos, mientras los portales educativos aplican la identidad oscura Epixum con componentes definidos directamente en cada página. Existen patrones repetidos para encabezados, tarjetas, estados vacíos, navegación, formularios y confirmaciones; algunas acciones todavía dependen de diálogos nativos. Véase `proposal.md` para la motivación y los specs delta para el comportamiento esperado.

La solución debe conservar Next.js App Router, Server Components, Tailwind CSS 4, las rutas actuales, la autorización por rol y las fuentes de datos existentes. Las métricas de portada deben derivarse de información disponible sin introducir contadores persistidos.

## Goals / Non-Goals

**Goals:**

- Construir una base visual y de interacción común sin convertir todas las pantallas en Client Components.
- Dar a cada rol una navegación reconocible y una portada centrada en próximas acciones.
- Reducir duplicación de layouts y componentes, manteniendo diferencias de densidad según el trabajo de cada rol.
- Mejorar accesibilidad, respuesta móvil y feedback de operaciones de forma verificable.
- Permitir una migración incremental por secciones sin romper URLs ni permisos.

**Non-Goals:**

- Cambiar autenticación, roles, reglas de PocketBase o modelo de matrículas.
- Incorporar notificaciones por correo, mensajería en tiempo real o estados de lectura persistentes.
- Reescribir el editor enriquecido, la subida a S3 o la preevaluación con IA.
- Agregar personalización visual por usuario o un tema claro en esta primera etapa.
- Rediseñar la identidad de marca, el logotipo o el color primario de Epixum.

## Decisions

### 1. Un shell compartido con configuración por rol

Se creará una estructura común de aplicación que reciba usuario, rol, navegación primaria y contexto. En escritorio usará una barra lateral compacta con área de contenido; en móvil, encabezado reducido y navegación inferior para los destinos principales. El shell renderizará solamente opciones autorizadas y marcará la ruta activa.

Se elige configuración por rol sobre tres layouts independientes para evitar divergencia y mantener una sola implementación de perfil, cierre de sesión, accesibilidad y responsive. Se descarta una navegación idéntica para todos porque cada rol posee prioridades diferentes y no debe ver destinos fuera de su alcance.

### 2. Sistema de diseño local, sin una nueva biblioteca de componentes

Los tokens existentes se reorganizarán en color, superficie, texto, borde, estado, espaciado, radio, sombra y movimiento. Sobre ellos se crearán primitivas locales: `Button`, `IconButton`, `Badge`, `Card`, `Field`, `Select`, `Dialog`, `Toast`, `EmptyState`, `Skeleton`, `PageHeader`, `Breadcrumbs`, `Tabs`, `StatCard`, `DataList` y `DataTable`.

Se mantiene Tailwind CSS 4 para reducir dependencias y preservar el modelo de estilos actual. Se descarta incorporar una biblioteca completa porque aumentaría el alcance y obligaría a reconciliar su identidad con Epixum. Los componentes complejos usarán elementos HTML semánticos, incluido `dialog` cuando resulte adecuado, con manejo explícito de foco y anuncios.

### 3. Densidad adaptada, gramática visual común

Administración usará vistas más densas, filtros persistentes y tablas en escritorio; docencia combinará resúmenes con listas operativas; estudio privilegiará continuidad, vencimientos y tarjetas de contenido. Los tres conservarán los mismos tokens, controles, estados y jerarquías.

Se descarta imponer tarjetas grandes en toda la aplicación: son adecuadas para selección de cursos, pero reducen eficiencia en gestión masiva de usuarios, entregas y consultas.

### 4. Portadas derivadas de datos vigentes

Los resúmenes se calcularán en Server Components mediante consultas existentes o consultas acotadas en paralelo. Los indicadores serán enlaces y mostrarán solo información accionable: cursos activos, entregas sin evaluación publicada, trabajos próximos y consultas pendientes. Se limitarán resultados detallados y se enlazará a vistas filtradas para evitar cargar colecciones completas.

Se descartan contadores persistidos en PocketBase en esta etapa porque agregan sincronización y migración sin necesidad demostrada. Si el volumen real produce latencia, se medirá antes de proponer agregados materializados.

### 5. Estado de filtros reflejado en la URL

Búsqueda, filtros, orden y paginación administrativa se representarán en parámetros de consulta. Los formularios de filtro podrán mejorar la interacción en cliente, pero la URL seguirá siendo fuente de verdad para recarga, navegación atrás y enlaces directos.

Se descarta mantener filtros solo en estado local porque se pierden al volver desde un detalle y dificultan compartir o reproducir una vista.

### 6. Contexto de curso mediante encabezado y navegación secundaria

Las rutas de curso conservarán su estructura, pero compartirán un encabezado con miga de pan, estado, acción primaria y pestañas permitidas: resumen, clases, trabajos, consultas y, para docentes, estudiantes y acceso. En móvil las pestañas admitirán desplazamiento horizontal dentro del componente, no en toda la página.

Se elige navegación secundaria sobre páginas monolíticas extensas para reducir desplazamiento y hacer predecible la ubicación. La portada del curso seguirá mostrando un resumen y accesos a las secciones.

### 7. Feedback no bloqueante y errores junto al origen

Las acciones usarán estados pendientes en el control que las inició, mensajes en contexto para validación y una región global de avisos para resultados. Las acciones destructivas requerirán un diálogo con objeto, consecuencia y acción explícita. El sistema preservará los datos ingresados ante errores recuperables.

Se eliminan progresivamente `alert` y `confirm`; se descartan mensajes exclusivamente temporales para errores que requieran corrección, ya que desaparecerían antes de resolverse.

### 8. Accesibilidad como criterio de aceptación transversal

Cada componente compartido incluirá foco visible, estados disabled y busy, etiquetas accesibles, objetivos táctiles adecuados y variantes que no dependan solo del color. Se agregará una regla global para movimiento reducido y se verificará contraste sobre las superficies reales. El orden visual deberá coincidir con el orden del DOM.

La revisión combinará pruebas automatizadas de componentes y recorridos manuales con teclado, zoom y lector de pantalla. No se considera suficiente una auditoría automática aislada.

## Risks / Trade-offs

- [El rediseño transversal puede generar una entrega demasiado grande] → Implementar por capas y mantener cada ruta funcional al terminar cada fase.
- [Las portadas pueden aumentar consultas y latencia] → Consultar en paralelo, limitar resultados, reutilizar datos ya cargados y medir antes de persistir agregados.
- [Un shell común puede filtrar enlaces pero no permisos] → Mantener todas las validaciones de servidor y PocketBase; la navegación nunca sustituye autorización.
- [Las tablas responsivas pueden ocultar contexto] → Definir explícitamente campos esenciales y ofrecer el resto en detalle o menú de acciones.
- [El verde de marca puede fallar en ciertas combinaciones] → Reservarlo para énfasis, validar contraste por variante y no usarlo como único indicador.
- [La consolidación puede alterar pantallas ya estables] → Añadir pruebas visuales y de recorrido para cada rol antes de retirar componentes anteriores.

## Migration Plan

1. Inventariar pantallas y estados, añadir tokens semánticos y primitivas compartidas sin cambiar rutas.
2. Implementar el shell común y migrar primero navegación, perfil y cierre de sesión para los tres roles.
3. Migrar administración: portada, cursos, usuarios, filtros y comportamiento móvil.
4. Migrar docencia: portada operativa, contexto de curso, clases, trabajos, entregas y consultas.
5. Migrar estudiantes: continuidad, Mis cursos, matrícula, curso, trabajos y consultas.
6. Reemplazar confirmaciones nativas, normalizar formularios y completar estados de carga, error y vacío.
7. Ejecutar auditoría de accesibilidad, pruebas responsive y recorridos completos por rol; retirar estilos y componentes duplicados.

Cada fase debe conservar build y recorridos esenciales. Si una fase falla en producción, se revierte únicamente la migración de esa sección, ya que no hay cambios de datos ni contratos de backend.
