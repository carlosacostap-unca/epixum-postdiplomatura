# Auditoría UX/UI por rol

Fecha de referencia: 2026-08-04
Cambio OpenSpec: `redesign-role-based-experience`

## Alcance y criterio

El inventario cubre todas las páginas autenticadas de `app/`, sus acciones principales, estados sin datos, feedback de error y patrones visuales. Las rutas se agrupan cuando comparten layout y objetivo; el inventario explícito al final permite comprobar que ninguna página quede fuera de la migración.

La pantalla `/login` se considera punto de entrada, pero no una ruta autenticada. `/` actúa únicamente como distribuidor por rol.

## Matriz de cobertura

| Área | Rutas | Acción o decisión principal | Estados actuales | Hallazgo y tratamiento previsto |
| --- | --- | --- | --- | --- |
| Administración · cursos | `/admin/courses`, `/admin/courses/new`, `/admin/courses/[id]` | Crear, editar o eliminar un curso | Tabla vacía; errores del formulario; `confirm`/`alert` al eliminar | Usa azul/zinc y tabla rígida, distinta de Epixum. Migrar a tokens, filtros en URL, vista móvil y diálogo accesible. |
| Administración · usuarios | `/admin/users` | Consultar usuarios y cambiar roles | Sin estado vacío explícito; feedback local del selector | Tabla rígida y cambio de privilegio sin contexto suficiente. Incorporar búsqueda, filtro, conteo, confirmación y alternativa móvil. |
| Docencia · portada | `/docentes`, `/docentes/clases` | Elegir curso o clase para gestionar | Sin cursos; curso sin clases | Visual Epixum, pero métricas y tarjetas ocupan mucho espacio y no muestran pendientes. Reemplazar por portada operativa y densidad adaptada. |
| Docencia · curso | `/docentes/cursos/[id]` | Gestionar clases, TPs, estudiantes, consultas y clave | Sin clases, TPs o estudiantes | Página extensa con muchas zonas competidoras. Dividir en resumen y navegación contextual persistente. |
| Docencia · clases | `/docentes/cursos/[id]/clases/nueva`, `/docentes/cursos/[id]/clases/[classId]`, `/editar`, `/recursos/nuevo` | Crear/editar clase y gestionar recursos | Sin recursos; errores dentro de formularios; `alert`/`confirm` en recursos | Encabezados y formularios repetidos; existe además el directorio duplicado `recursos/nueva`. Consolidar componentes y feedback. |
| Docencia · TPs | `/docentes/cursos/[id]/tps/nuevo`, `/docentes/cursos/[id]/tps/[tpId]` | Crear TP, gestionar recursos, entregas y evaluación | Sin recursos o entregas; errores nativos; confirmación nativa de eliminación | La revisión no prioriza pendientes de forma global. Incorporar estados semánticos, filtros y acceso desde portada. |
| Docencia · consultas | `/docentes/cursos/[id]/consultas`, `/nueva`, `/[inquiryId]` | Crear, responder y resolver consultas | Sin consultas/respuestas; errores con `alert` | Listado visualmente consistente, pero sin filtros de atención ni resumen transversal. Incorporar estado, orden y feedback común. |
| Estudio · portada | `/estudiantes` | Continuar un curso o matricularse | Sin matrículas; error/éxito inline en matrícula | Buena identidad, pero prioriza bienvenida y cantidad sobre próxima actividad. Reordenar hacia continuidad y vencimientos. |
| Estudio · curso | `/estudiantes/cursos/[id]` | Abrir próxima clase, TP o foro | Sin clases; TPs ausentes se ocultan | Página extensa sin navegación secundaria ni próxima acción destacada. Incorporar resumen y pestañas contextuales. |
| Estudio · clases | `/estudiantes/cursos/[id]/clases/[classId]` | Consumir contenido, descargar recursos, consultar | Sin descripción/recursos; descarga usa `alert` | Normalizar recursos, estados de descarga y acceso contextual al foro. |
| Estudio · TPs | `/estudiantes/cursos/[id]/tps/[tpId]` | Comprender y entregar el trabajo | Sin recursos; progreso de archivo; varios errores con `alert` | Flujo crítico con mucha carga cognitiva. Clarificar fecha, estado, entrega vigente, progreso y recuperación de errores. |
| Estudio · consultas | `/estudiantes/cursos/[id]/consultas`, `/nueva`, `/[inquiryId]` | Preguntar, responder y resolver | Sin consultas/respuestas; errores con `alert` | Falta acceso directo a conversaciones propias pendientes y feedback compartido. |
| Perfil | `/profile` y panel lateral de perfil | Consultar y editar datos personales | Error local; dos presentaciones distintas | Consolidar una experiencia común dentro del shell, con validación asociada a cada campo. |
| Compatibilidad · clases | `/classes`, `/classes/new`, `/classes/[id]`, `/classes/[id]/resources/new` | Listar y gestionar/consultar clases | Sin clases/recursos; errores nativos | Lenguaje visual heredado azul/zinc y rutas paralelas a los portales. Mantener compatibilidad mientras se migran consumidores. |
| Compatibilidad · TPs | `/assignments`, `/assignments/new`, `/assignments/[id]`, `/assignments/[id]/deliveries/[deliveryId]` | Listar, entregar, revisar y evaluar TPs | Sin TPs/enlaces/entregas; errores nativos | Duplica parte del flujo contextual. Preservar URLs y converger en componentes compartidos antes de retirar duplicación. |
| Compatibilidad · consultas | `/inquiries`, `/inquiries/new`, `/inquiries/[id]` | Listar, crear, responder y resolver consultas | Sin consultas/respuestas; errores y confirmaciones nativas | Ya posee búsqueda/filtros reutilizables, pero usa estilos heredados. Migrar sin perder capacidades. |

## Patrones duplicados detectados

1. `app/docentes/layout.tsx` y `app/estudiantes/layout.tsx` repiten estructura, navegación móvil, avatar, perfil, cierre de sesión y fondo ambiental.
2. `components/Header.tsx` crea una tercera navegación para administración y rutas compartidas.
3. Los encabezados de curso, enlaces Volver y tarjetas de estado se recrean en casi cada página docente y estudiante.
4. Formularios de clases y recursos poseen implementaciones paralelas; existen rutas `recursos/nueva` y `recursos/nuevo`.
5. Las descargas y eliminaciones repiten manejo imperativo mediante `alert` y `confirm`.
6. Administración y rutas compartidas usan azul/zinc, mientras los portales usan los tokens Epixum.
7. Estados vacíos suelen ser texto aislado y no siempre incluyen una acción de recuperación.
8. Carga, éxito y error carecen de una región de anuncios y una gramática compartida.

## Inventario explícito de páginas autenticadas

### Administración

- `/admin/courses`
- `/admin/courses/new`
- `/admin/courses/[id]`
- `/admin/users`

### Docencia

- `/docentes`
- `/docentes/clases`
- `/docentes/cursos/[id]`
- `/docentes/cursos/[id]/clases/nueva`
- `/docentes/cursos/[id]/clases/[classId]`
- `/docentes/cursos/[id]/clases/[classId]/editar`
- `/docentes/cursos/[id]/clases/[classId]/recursos/nuevo`
- `/docentes/cursos/[id]/consultas`
- `/docentes/cursos/[id]/consultas/nueva`
- `/docentes/cursos/[id]/consultas/[inquiryId]`
- `/docentes/cursos/[id]/tps/nuevo`
- `/docentes/cursos/[id]/tps/[tpId]`

### Estudiantes

- `/estudiantes`
- `/estudiantes/cursos/[id]`
- `/estudiantes/cursos/[id]/clases/[classId]`
- `/estudiantes/cursos/[id]/consultas`
- `/estudiantes/cursos/[id]/consultas/nueva`
- `/estudiantes/cursos/[id]/consultas/[inquiryId]`
- `/estudiantes/cursos/[id]/tps/[tpId]`

### Compartidas y de compatibilidad

- `/profile`
- `/classes`
- `/classes/new`
- `/classes/[id]`
- `/classes/[id]/resources/new`
- `/assignments`
- `/assignments/new`
- `/assignments/[id]`
- `/assignments/[id]/deliveries/[deliveryId]`
- `/inquiries`
- `/inquiries/new`
- `/inquiries/[id]`

## Criterio de salida para las etapas siguientes

Cada familia se considerará migrada cuando conserve permisos y URL, utilice el shell y los componentes compartidos, comunique carga/vacío/error/éxito, sea operable por teclado a 320 px y ya no dependa de `alert` o `confirm`.
