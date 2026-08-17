## Context

Los cursos ya distinguen organización tradicional o semanal y sus pantallas cargan clases, trabajos y consultas desde PocketBase. Los recursos se guardan en `links`, con padres opcionales de clase o trabajo, y los archivos reutilizan URLs prefirmadas de iDrive. El formulario administrativo es el único punto normal de escritura de las configuraciones de curso.

El cambio atraviesa esquema, reglas, acciones, consultas, navegación y vistas de los tres roles. Véase `proposal.md` para la motivación y los deltas de `specs/` para el contrato observable.

## Goals / Non-Goals

**Goals:**

- Incorporar contenidos como entidad propia y mantener el curso como límite de autorización.
- Conservar una única implementación para cursos tradicionales y semanales.
- Reutilizar el editor enriquecido y el flujo de recursos existente.
- Hacer que el orden manual sea estable, recuperable ante fallos y utilizable con teclado o dispositivos táctiles.
- Permitir una migración y una reversión de aplicación sin destruir datos.

**Non-Goals:**

- Asociar contenidos a semanas, clases o trabajos prácticos.
- Incorporar borradores, publicación programada, fechas, progreso de lectura o requisitos previos.
- Permitir que administradores creen o editen contenidos desde la interfaz.
- Ordenar los recursos internos de cada contenido o migrar recursos existentes hacia la nueva entidad.
- Eliminar del almacenamiento S3 los binarios huérfanos como parte de este cambio.

## Decisions

### 1. Configuración booleana persistida en el curso

`courses` incorporará `contentsEnabled`, un booleano con valor inicial `false`. El formulario administrativo lo presentará como una opción explícita y las acciones de creación y edición lo normalizarán desde el `FormData`.

Cambiar el valor sólo modifica disponibilidad, navegación y autorización. No crea, modifica ni elimina contenidos. Las reglas de actualización de cursos impedirán que un docente incluya `contentsEnabled` en una escritura, del mismo modo que hoy se protegen `organizationMode` y `enrollmentMode`.

Se descarta inferir la característica por la existencia de registros porque impediría que un administrador la habilite antes de cargar material y haría imposible ocultarla sin eliminar datos.

### 2. Colección independiente `course_contents`

Cada contenido será un registro con:

- `course`: relación singular, obligatoria y con eliminación en cascada al borrar el curso;
- `title`: texto obligatorio con el mismo límite práctico usado por clases y semanas;
- `description`: texto enriquecido compatible con el editor actual;
- `position`: entero no negativo usado exclusivamente dentro de su curso.

La colección tendrá un índice de consulta por `course` y `position`. Las lecturas usarán `position`, `created` e `id` como desempate estable. El curso no mantendrá una relación inversa manual: `course_contents.course` será la única fuente de pertenencia.

Se elige una colección en lugar de JSON o HTML embebido en `courses` porque cada contenido necesita identidad para rutas, recursos, permisos, edición y orden independiente.

### 3. Orden mediante posiciones normalizadas y actualizaciones compensables

Al crear un contenido, la acción calculará la siguiente posición al final de la lista. El reordenamiento recibirá la secuencia completa de identificadores, comprobará que coincide exactamente con los contenidos actuales del curso y actualizará las posiciones consecutivas. Como la instancia desplegada de PocketBase no admite solicitudes batch, la acción conservará las posiciones originales y, si una actualización falla, intentará compensar las ya aplicadas antes de devolver el error.

La interfaz canónica ofrecerá controles accesibles para mover cada elemento hacia arriba o abajo. Un gesto de arrastre puede añadirse como mejora progresiva, pero no será necesario para operar la función ni para las pruebas.

La compensación reduce el riesgo de estados parciales sin habilitar globalmente las solicitudes batch de PocketBase. Se descarta guardar el orden como un arreglo en `courses` porque obligaría a los docentes a actualizar una colección cuya configuración está protegida para administradores y duplicaría la fuente de pertenencia.

### 4. Recursos con exactamente un padre

`links` incorporará una relación opcional y singular `content` hacia `course_contents`, con eliminación en cascada del registro de recurso cuando se elimina su contenido padre. Las acciones y reglas exigirán que exactamente uno de `class`, `assignment` o `content` esté definido.

Los formularios y componentes de recursos se generalizarán para aceptar un padre discriminado, manteniendo las rutas actuales de clases y trabajos. Las descargas de archivos resolverán el curso desde cualquiera de los tres padres y comprobarán la habilitación cuando el padre sea un contenido.

Se reutiliza `links` en lugar de crear una segunda colección porque los tipos, la firma de archivos, la descarga autenticada y la presentación son equivalentes.

### 5. Autorización en servidor y PocketBase

Las acciones Next.js validarán antes de toda lectura o escritura:

- contenido habilitado en el curso;
- rol `docente` y pertenencia a `course.teachers` para gestionar;
- rol `estudiante` y matrícula vigente para consultar;
- coincidencia entre el curso de la ruta, el contenido y sus recursos.

Las reglas de `course_contents` repetirán las garantías críticas. Los administradores de aplicación podrán cambiar `contentsEnabled`, pero no recibirán permisos de gestión de contenidos; los superusuarios de PocketBase conservan su capacidad operativa propia. Las reglas de `links` incorporarán el tercer padre y no permitirán que una relación de recurso eluda la habilitación o el alcance del curso.

Las reglas de actualización de `courses` se mantendrán coherentes en los scripts de esquema semanal, matrícula por invitación y contenidos, para que volver a ejecutar cualquiera de ellos no retire la protección del nuevo campo.

### 6. Sección y rutas dedicadas

Cuando `contentsEnabled` sea verdadero, los contextos docente y estudiante añadirán una pestaña “Contenidos” que conduce a rutas dedicadas bajo el curso. La lista docente ofrecerá alta, edición, eliminación y reordenamiento; el detalle permitirá administrar recursos. La lista y el detalle estudiantil serán de sólo lectura.

La pestaña no aparecerá y las rutas rechazarán el acceso cuando la característica esté deshabilitada. El mismo flujo se utilizará en organización tradicional y semanal, sin agregar `week` a la colección ni mezclar contenidos dentro de los grupos semanales.

### 7. Consultas y revalidación

Las consultas de contenidos filtrarán siempre por curso y ordenarán en PocketBase. Las páginas cargarán contenido y recursos desde el servidor con la sesión HttpOnly existente. Después de crear, editar, eliminar o reordenar se revalidarán las rutas docente y estudiante del curso afectado; alternar la característica revalidará además sus contextos de navegación.

No se añadirán datos de contenidos al cálculo de próximas clases o trabajos pendientes, porque no poseen fecha ni estado de finalización.

### 8. Migración idempotente aislada y compatible

Un script de esquema específico agregará `contentsEnabled`, creará o reconciliará `course_contents`, añadirá `links.content`, instalará índices y reglas y actualizará las reglas de `courses` y `links`. El script fusionará campos e índices por nombre para poder ejecutarse varias veces.

El booleano agregado deja a cursos existentes en `false`; la migración verificará explícitamente esa compatibilidad sin tocar las demás relaciones. También se actualizarán las migraciones existentes que escriben la regla de cursos para evitar regresiones al ejecutarlas en otro orden.

## Risks / Trade-offs

- [Reglas relacionales de `links` más complejas por el tercer padre] → Centralizar la resolución del padre y cubrir combinaciones válidas e inválidas con pruebas de acciones y de acceso real a PocketBase.
- [Dos docentes pueden reordenar simultáneamente] → Validar el conjunto vigente inmediatamente antes de actualizar y ordenar también por `id` para mantener una salida determinista si las operaciones se solapan.
- [Un script de esquema antiguo puede sobrescribir reglas nuevas] → Actualizar y probar todos los scripts que escriben `courses.updateRule`, incluida la ejecución en órdenes distintos.
- [Deshabilitar la función puede parecer pérdida de información] → Explicarlo en el formulario administrativo y conservar registros, recursos y posiciones sin modificación.
- [La lista puede crecer y hacer costoso un reordenamiento completo] → Usar una única consulta, omitir posiciones que no cambiaron y posponer paginación mientras el orden manual requiera una secuencia completa.
- [Eliminar un contenido borra sus registros `links` pero no necesariamente los objetos S3] → Mantener el comportamiento actual de recursos y tratar la limpieza de objetos como una iniciativa separada.

## Migration Plan

1. Ejecutar la migración idempotente y sus pruebas sobre un esquema simulado, verificando campos, índices, reglas y compatibilidad con scripts existentes.
2. Validar contra PocketBase con usuarios de cada rol que el valor inicial sea deshabilitado y que no haya acceso directo indebido.
3. Desplegar tipos, consultas y acciones compatibles con `contentsEnabled = false`; en este estado ninguna navegación existente cambia.
4. Desplegar las interfaces administrativa, docente y estudiantil y habilitar primero un curso de prueba.
5. Verificar alta, edición, recursos, reordenamiento, acceso estudiantil, deshabilitación y reactivación con conservación de datos.

Para revertir la aplicación se deshabilita la característica y se vuelve a la versión anterior sin retirar campos ni colecciones. La eliminación física de `course_contents` o `links.content` queda fuera del rollback automático para evitar pérdida de materiales.
