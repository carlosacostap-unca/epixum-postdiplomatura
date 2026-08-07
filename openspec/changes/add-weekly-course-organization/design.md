## Context

Actualmente `courses` relaciona directamente docentes y contenido; `classes`, `assignments` e `inquiries` también conservan su curso, y las pantallas docente y estudiante consultan esas relaciones sin un nivel intermedio. Véase `proposal.md` para la motivación y los deltas de `specs/` para el comportamiento acordado.

El cambio atraviesa el esquema de PocketBase, las reglas de acceso, acciones de servidor, consultas y vistas de los tres roles. Debe preservar datos existentes, mantener operativos los cursos tradicionales y evitar que una semana oculta pueda exponerse mediante una URL directa o una consulta normal a PocketBase.

## Goals / Non-Goals

**Goals:**

- Introducir una estructura semanal opcional sin bifurcar por completo el dominio ni duplicar pantallas.
- Mantener el curso como límite de autorización y la semana como unidad de organización y publicación.
- Permitir que el docente organice contenido gradualmente mediante una bandeja sin asignar.
- Resolver la publicación programada sin procesos residentes ni una nueva dependencia operativa.
- Ejecutar una migración idempotente y permitir una reversión de aplicación sin destruir la estructura semanal creada.

**Non-Goals:**

- Generar semanas automáticamente o pedir al administrador una cantidad total.
- Convertir fechas de clases o vencimientos en semanas de forma automática.
- Crear un calendario, recurrencias, asistencia o progreso académico por semana.
- Permitir consultas generales de estudiantes dentro de cursos semanales.
- Modificar entregas, evaluaciones, matrículas, archivos o notificaciones.

## Decisions

### 1. Modalidad persistida en el curso

`courses` incorporará `organizationMode`, un campo select con valores `tradicional` y `semanal`, cuyo valor inicial será `tradicional`. La acción administrativa será el único punto normal de escritura de este campo y volverá a validar las vistas de los tres roles.

Cambiar la modalidad sólo altera consultas y presentación: no crea semanas, no modifica relaciones de contenido y no elimina registros. Esto permite volver a `tradicional` mostrando listas planas y recuperar exactamente la estructura anterior al reactivar `semanal`.

Se descarta migrar o copiar contenido al alternar la modalidad porque produciría asignaciones implícitas, pérdida de intención docente y una reversión compleja.

### 2. Colección independiente `course_weeks`

Cada semana será un registro con:

- `course`: relación única, obligatoria y con eliminación en cascada al borrar el curso.
- `number`: entero no negativo obligatorio a nivel de dominio; admite `0` como primera semana. En PocketBase se configura `required: false` porque esa opción exige un valor distinto de cero; el campo numérico sigue siendo no nulo y la aplicación valida explícitamente la entrada.
- `title`: texto obligatorio.
- `startDate` y `endDate`: fechas opcionales.
- `status`: `borrador`, `publicada` o `programada`.
- `publishAt`: fecha y hora obligatoria únicamente para `programada`.

Un índice único compuesto por curso y número impedirá duplicados concurrentes. La presentación se ordenará por `number`; las fechas describen el período, pero no determinan el orden ni generan semanas.

Se elige una colección en lugar de JSON embebido en `courses` porque las semanas necesitan identidad estable, permisos propios, filtros, relaciones desde varias colecciones y actualizaciones independientes.

### 3. El contenido conserva `course` y añade `week`

`classes`, `assignments` e `inquiries` incorporarán una relación opcional y singular `week`. Se conservará la relación directa `course` como límite de autorización, compatibilidad con rutas existentes y filtro eficiente en modalidad tradicional.

Las acciones de servidor comprobarán que `content.course === week.course` al crear, mover o editar contenido. Las relaciones a semana no usarán eliminación en cascada: al eliminar una semana, sus elementos deben sobrevivir como contenido sin asignar.

Se descarta derivar el curso exclusivamente desde la semana porque impediría representar contenido sin asignar, complicaría la compatibilidad y obligaría a reescribir todos los controles de alcance actuales.

### 4. Visibilidad efectiva derivada, sin tarea programada

Una semana será efectivamente visible cuando:

- tenga estado `publicada`; o
- tenga estado `programada`, `publishAt` exista y `publishAt` sea menor o igual a la hora actual.

No será necesario cambiar persistentemente `programada` a `publicada`. Las consultas del servidor y las reglas de PocketBase evaluarán la misma condición temporal, por lo que el contenido quedará disponible en la primera lectura realizada después del horario configurado incluso si no hubo un proceso activo.

Se descarta un cron para cambiar estados porque agrega infraestructura, carreras entre actualización y lectura y un punto de fallo innecesario. En la interfaz docente una programación cumplida podrá comunicarse como efectivamente publicada sin perder el dato de que su origen fue una programación.

### 5. La semana protege también el acceso directo al contenido

En modalidad `semanal`, un estudiante sólo podrá leer una clase, trabajo o consulta si está matriculado, el contenido tiene semana y esa semana es efectivamente visible. El contenido sin asignar, en borrador o programado para el futuro será visible sólo para docentes asignados y, en lectura operativa, administradores.

Las páginas y acciones de servidor aplicarán el mismo control antes de mostrar detalles, crear entregas, descargar recursos, crear consultas o responder conversaciones. Las reglas de PocketBase se ajustarán como defensa en profundidad para impedir que el cliente consulte directamente contenido anticipado.

En modalidad `tradicional`, el campo `week` se ignora para agrupación y visibilidad; continúan vigentes las reglas actuales de matrícula, curso y rol.

### 6. Gestión semanal integrada al contexto docente

La portada docente del curso semanal mostrará:

- semanas ordenadas con estado, fechas, cantidades y acciones de edición;
- una acción para crear semana;
- una bandeja “Sin asignar” para clases, trabajos y consultas;
- controles accesibles para asignar o mover contenido mediante selección explícita.

No se exigirá arrastrar y soltar: puede incorporarse como mejora progresiva, pero los selectores y botones serán la interacción canónica para teclado, dispositivos táctiles y pruebas automatizadas. Los formularios de clase y trabajo admitirán una semana opcional; la creación contextual desde una semana la preseleccionará.

El administrador verá y modificará la modalidad en el formulario del curso, con una explicación de que el cambio conserva la estructura. No administrará el número ni la creación de semanas.

### 7. Recorrido semanal del estudiante

El curso semanal se presentará por semanas efectivamente visibles, ordenadas por número. Dentro de cada semana se agruparán clases, trabajos y acceso a sus consultas; los trabajos conservarán vencimiento y estado de entrega. No se mostrará una sección de contenido sin asignar.

Al crear una consulta, el formulario requerirá una semana visible. Si la acción comienza desde una clase o trabajo asignado, la semana se completará desde ese contenido y el servidor rechazará valores contradictorios.

Las portadas de estudiante y docente seguirán calculando próximas acciones desde contenido efectivamente visible, independientemente de que el curso sea tradicional o semanal.

### 8. Permisos y consistencia en dos capas

Las acciones Next.js validarán identidad, rol, asignación docente, modalidad y coherencia entre curso y semana antes de escribir. Las reglas de PocketBase repetirán las garantías críticas:

- el administrador puede cambiar `organizationMode`;
- solamente un docente relacionado en `course.teachers` puede crear, editar o eliminar semanas;
- docentes ajenos no pueden leer la bandeja ni gestionar semanas;
- estudiantes matriculados sólo leen semanas y contenido efectivamente visibles;
- una relación de semana no habilita por sí sola contenido de otro curso.

La lectura administrativa de semanas se conserva para diagnóstico y gestión general, sin ofrecer acciones de administración semanal en la interfaz.

## Risks / Trade-offs

- [Las reglas relacionales y temporales de PocketBase pueden volverse complejas] → Mantener condiciones equivalentes pequeñas, cubrirlas con una matriz de pruebas por rol y validar consultas reales con tokens impersonados.
- [Conservar `course` y `week` permite una combinación inconsistente] → Centralizar la validación de pertenencia en servidor y añadir pruebas negativas; PocketBase continúa limitando acceso por curso.
- [Una semana programada no cambia físicamente de estado] → Tratar la visibilidad como estado efectivo derivado y etiquetar claramente las programaciones ya cumplidas.
- [Contenido existente queda oculto al activar modalidad semanal] → Mostrarlo inmediatamente en “Sin asignar”, explicar el efecto antes del cambio administrativo y no modificarlo automáticamente.
- [Eliminar una semana podría dejar contenido difícil de encontrar] → Confirmar la consecuencia y mover sus elementos a la bandeja sin asignar en la misma experiencia.
- [Las portadas podrían aumentar consultas] → Cargar semanas y contenido en paralelo, limitar campos y reutilizar los conjuntos ya obtenidos para agrupación y próximas acciones.

## Migration Plan

1. Extender el script de esquema idempotente para agregar `courses.organizationMode`, crear `course_weeks`, añadir relaciones `week` opcionales e instalar índices y reglas.
2. Ejecutar primero la migración contra un esquema de prueba y verificar que todos los cursos existentes quedan en `tradicional` y que los conteos de contenido no cambian.
3. Incorporar tipos, validadores, consultas y acciones compatibles con ambos modos.
4. Desplegar la interfaz administrativa y docente; mantener todos los cursos en modalidad tradicional durante la verificación inicial.
5. Desplegar la vista y controles estudiantiles, probar accesos directos y activar un curso de prueba como semanal.
6. Validar creación, programación, publicación, bandeja sin asignar, consultas obligatoriamente semanales y alternancia reversible de modalidad.

Para revertir la aplicación, se vuelve a la versión anterior sin eliminar campos ni semanas: el código anterior ignorará las relaciones nuevas y los cursos pueden dejarse temporalmente en `tradicional`. La eliminación física del esquema queda fuera del rollback automático para evitar pérdida de la organización creada.
