# Componentes compartidos y criterios de aceptación

Esta guía es el contrato de composición para nuevas pantallas autenticadas de Epixum. Los componentes se importan desde `@/components/ui`; no se deben recrear variantes locales de botones, diálogos, tarjetas o estados.

## Primitivas

| Necesidad | Componente | Regla de uso |
| --- | --- | --- |
| Acción | `Button`, `IconButton` | Una acción primaria por bloque. `IconButton` siempre lleva `label`. Usar `isPending` durante mutaciones. |
| Estado | `Badge` | Acompañar el color con texto inequívoco. |
| Contenido agrupado | `Card`, `CardContent` | No anidar tarjetas sólo para crear separación visual. |
| Formularios | `Field`, `Select` | El error vive junto al campo y se anuncia; no usar placeholders como única etiqueta. |
| Navegación contextual | `Breadcrumbs`, `Tabs`, `PageHeader` | `PageHeader` contiene título, descripción, metadatos y la acción principal. |
| Datos | `DataTable`, `DataList`, `StatCard` | Tabla para gestión densa; lista/tarjeta para recorridos de aprendizaje. |
| Feedback | `ToastProvider`, `useToast`, `Dialog`, `ConfirmDialog` | Toast para resultado no bloqueante; diálogo sólo para decisiones que requieren atención. Nunca `alert` o `confirm` nativos. |
| Estados de consulta | `Skeleton`, `LoadingState`, `EmptyState`, `ErrorState` | Toda consulta visible debe tener carga, vacío y error recuperable. |

## Composición por niveles

1. El layout de rol autentica y renderiza `AppShell`.
2. Cada ruta usa un único `PageHeader` o el contexto de curso `TeacherCourseContext`/`StudentCourseContext`.
3. Los resúmenes accionables se presentan antes que listados extensos.
4. Búsqueda, filtros y orden persistentes usan parámetros de URL.
5. Las mutaciones conservan los datos ingresados si fallan, muestran un error junto al origen y ofrecen reintento.
6. Las rutas de rol incluyen `loading.tsx` y `error.tsx`; el límite de error nunca reemplaza el shell ni la navegación.

## Criterios de aceptación para una pantalla nueva

- Tiene un único `h1`, landmarks y nombres accesibles para navegación, formularios e iconos interactivos.
- Se puede recorrer, activar, cancelar y reintentar sólo con teclado; al cerrar un diálogo el foco vuelve al disparador.
- No genera desplazamiento horizontal a 320 px ni en el equivalente de reflow a 200 %.
- Respeta `prefers-reduced-motion` y no usa el color como única señal.
- Contempla skeleton, vacío, error y reintento; toda mutación bloquea dobles envíos y comunica éxito o fallo.
- Mantiene controles táctiles de al menos 44 × 44 px y los contrastes documentados en `FOUNDATIONS.md`.
- Autoriza nuevamente en el servidor cada lectura sensible y mutación; ocultar un control no reemplaza la autorización.
- Pasa `npm run lint`, `npx tsc --noEmit`, `npm run test:ui` y `npm run build`.

## Compatibilidad

Las rutas históricas `/classes`, `/assignments`, `/inquiries` y `/profile` sólo preservan enlaces guardados mediante redirecciones. La excepción es el detalle de entrega con preevaluación por IA, que conserva su URL y ahora se muestra dentro de `AppShell`. No se deben añadir consumidores nuevos a las rutas históricas.
