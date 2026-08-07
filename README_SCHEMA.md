# Configuración de PocketBase para Epixum Node

Para que la aplicación funcione correctamente, necesitas crear las siguientes colecciones en tu instancia de PocketBase (`https://epixum-node.pockethost.io/`).

## 1. Colección: `courses`
- **Name**: `courses`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Editor (Rich Text)
    - `startDate`: Date
    - `endDate`: Date
    - `status`: Select (options: "borrador", "en curso", "finalizado")
    - `organizationMode`: Select (options: "tradicional", "semanal"). Los registros existentes se inicializan como `tradicional`.
    - `enrollmentMode`: Select (options: "clave", "invitacion_contrasena"). Los registros existentes se inicializan como `clave`.
    - `enrollmentKeyHash`: Text (Hidden, 64 caracteres). Se genera en el servidor; nunca se guarda la clave en texto plano.
    - `invitationPasswordHash`: Text (Hidden, 64 caracteres). HMAC sensible a mayúsculas de la contraseña compartida.
    - `students`: Relation (Multiple) -> Collection: `users`
    - `teachers`: Relation (Multiple) -> Collection: `users`
    - `classes`: Relation (Multiple) -> Collection: `classes`
    - `assignments`: Relation (Multiple) -> Collection: `assignments`
    - `inquiries`: Relation (Multiple) -> Collection: `inquiries`
- **API Rules**:
    - **List/View Rule**: `""` (Public, para que los invitados puedan ver los cursos en la página de inicio)
    - **Create/Update/Delete Rule**: `@request.auth.role = "admin"`

### Users Collection (`users`)

- **role**: Select (options: "admin", "docente", "estudiante").
- **firstName**: Text (Required)
- **lastName**: Text (Required)
- **dni**: Text
- **birthDate**: Date
- **phone**: Text
  - Esto permitirá identificar los permisos de cada usuario.

### API Rules (Reglas de Acceso)

Para que el rol "Docente" pueda gestionar el contenido, debes configurar las siguientes reglas en PocketBase:

**Collections: `classes`, `assignments`, `links`**

- **List/View Rule**: `""` (Público o accesible para todos los autenticados, según prefieras. Si es solo estudiantes/docentes: `@request.auth.id != ""`)
- **Create/Update/Delete Rule**: `@request.auth.role = "docente" || @request.auth.role = "admin"`

**Collection: `users`**

- **List/View Rule**: `id = @request.auth.id || @request.auth.role = "admin"`
- **Create Rule**: `@request.context = "oauth2"` (alta automática exclusivamente desde Google OAuth)
- **Update Rule**: `(id = @request.auth.id && ((role = "" && @request.body.role = "estudiante") || @request.body.role:isset = false)) || @request.auth.role = "admin"`
  - *Nota*: un usuario nuevo puede asignarse solamente el rol inicial `estudiante`; después no puede cambiar su propio rol.
- **Delete Rule**: `id = @request.auth.id || @request.auth.role = "admin"`
  - *Nota*: Permite que los usuarios borren su cuenta y que los admins borren a cualquiera.

## Colección: `course_enrollments` (Matrículas)
- **Name**: `course_enrollments`
- **Type**: `Base`
- **Fields**:
    - `course`: Relation (Single, Required) -> Collection: `courses`
    - `student`: Relation (Single, Required) -> Collection: `users`
    - `keyHash`: Text (Hidden, 64 caracteres). Prueba que la matrícula fue autorizada por una clave válida.
    - `invitation`: Relation (Single, Optional) -> Collection: `course_enrollment_invitations`.
- **Índice único**: `(course, student)` para impedir matrículas duplicadas.
- **API Rules**:
    - **List/View**: el estudiante ve sus matrículas; los docentes asignados y administradores ven las de sus cursos.
    - **Create**: bloqueado para clientes directos. Una Server Action valida identidad, modalidad y credencial, y un cliente de servicio exclusivo del servidor crea la matrícula.
    - **Update**: bloqueado.
    - **Delete**: docentes asignados o administradores.

El script `npm run setup:enrollment` agrega este esquema, migra la relación heredada `courses.students` y elimina la colección anterior `enrollment_requests`.

## Colecciones de doble validación

- `course_enrollment_invitations`: relaciona un curso con un `emailNormalized` único, estado `pendiente`, `activada` o `revocada`, estudiante y fecha de activación opcionales; declara `created` y `updated` como campos `autodate`.
- `course_enrollment_attempts`: registra solamente curso, invitación, estudiante y fechas automáticas de cada contraseña incorrecta; nunca persiste la contraseña ni su HMAC.
- Los administradores gestionan invitaciones. Los docentes asignados pueden rotar la contraseña del curso, pero no consultar emails invitados.
- Los estudiantes sólo leen invitaciones pendientes que coinciden con su email autenticado y no pueden alterar invitaciones ni borrar intentos. La activación y la matrícula se persisten exclusivamente desde una Server Action autenticada.
- Cinco intentos incorrectos dentro de 15 minutos bloquean temporalmente la activación.
- `npm run schema:invitation` aplica únicamente esta migración de forma idempotente y sin eliminar registros.
- La guía de operación, rotación, estados, rollback y mantenimiento está en [`docs/invitation_enrollment/README.md`](docs/invitation_enrollment/README.md).

## Colección: `course_weeks` (Semanas del curso)

- **Campos**: `course` (requerido), `number` (entero no negativo, desde 0), `title`, `startDate`, `endDate`, `status` (`borrador`, `publicada`, `programada`) y `publishAt`.
- **Índice único**: `(course, number)`.
- **Gestión**: solamente docentes asignados a cursos con modalidad semanal.
- **Lectura estudiantil**: requiere matrícula y una semana publicada o cuya programación ya se cumplió.
- `classes`, `assignments` e `inquiries` incorporan una relación singular y opcional `week`, sin eliminar el contenido cuando se borra la semana.
- El contenido sin semana permanece disponible para el docente y oculto al estudiante mientras el curso sea semanal.

`npm run setup:enrollment` también aplica esta migración de forma idempotente. `npm run schema:test` verifica primera ejecución, reejecución y conservación de registros.

La guía operativa, los permisos, la estrategia de rollback y los criterios de aceptación están en [`docs/weekly_course/README.md`](docs/weekly_course/README.md).

## Pasos para implementar Roles

1.  Ve a la colección `users` > Edit Collection > Add Field > Select.

## 2. Colección: `classes`
- **Name**: `classes`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Text
    - `date`: Date

## 3. Colección: `assignments` (Trabajos Prácticos)
- **Name**: `assignments`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Editor (Rich Text)
    - `dueDate`: Date

## 4. Colección: `links`
- **Name**: `links`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `url`: URL (Required)
    - `class`: Relation (Single, Optional) -> Collection: `classes`
    - `assignment`: Relation (Single, Optional) -> Collection: `assignments`

## 5. Colección: `deliveries` (Entregas de TP)
- **Name**: `deliveries`
- **Type**: `Base`
- **Fields**:
    - `assignment`: Relation (Single, Required) -> Collection: `assignments`
    - `student`: Relation (Single, Required) -> Collection: `users`
    - `repositoryUrl`: URL (Required)
- **Constraints**:
    - Unique index on `assignment` + `student` (Un estudiante solo puede tener una entrega por TP)
- **API Rules**:
    - **List/View Rule**: `student = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`
        - *Nota*: Los estudiantes solo ven sus entregas; docentes/admins ven todas.
    - **Create Rule**: `@request.auth.id != "" && @request.auth.role = "estudiante"`
    - **Update Rule**: `student = @request.auth.id || @request.auth.role = "admin"`
        - *Nota*: Estudiantes pueden modificar su entrega.
    - **Delete Rule**: `student = @request.auth.id || @request.auth.role = "admin"`

## 6. Colección: `teams`
- **Name**: `teams`
- **Type**: `Base`
- **Fields**:
    - `name`: Text (Required)
    - `members`: Relation (Multiple) -> Collection: `users`
- **API Rules**:
    - **List/View**: `@request.auth.id != ""`
    - **Create/Update/Delete**: `@request.auth.role = "docente" || @request.auth.role = "admin"`

## 8. Colección: `messages` (Chat de Equipo)
- **Name**: `messages`
- **Type**: `Base`
- **Fields**:
    - `text`: Text (Required)
    - `sender`: Relation (Single, Required) -> Collection: `users` (Renamed from `user` to avoid system conflicts)
    - `team`: Relation (Single, Required) -> Collection: `teams`
- **API Rules**:
    - **List/View**: `@request.auth.id != "" && team.members.id ?= @request.auth.id`
        - *Nota*: Solo los miembros del equipo pueden ver los mensajes.
    - **Create Rule**: `@request.auth.id != "" && @request.data.team.members ?= @request.auth.id`

## 9. Colección: `inquiries` (Consultas)
- **Name**: `inquiries`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Text (Required)
    - `status`: Select (options: "Pendiente", "Resuelta") (Default: "Pendiente")
    - `author`: Relation (Single, Required) -> Collection: `users`
    - `class`: Relation (Single, Optional) -> Collection: `classes`
    - `assignment`: Relation (Single, Optional) -> Collection: `assignments`
- **API Rules**:
    - **List/View**: `@request.auth.id != ""` (Cualquier usuario autenticado puede ver las consultas)
    - **Create**: `@request.auth.id != ""`
    - **Update**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"` (Autor o docentes pueden marcar como resuelta)
    - **Delete**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`

## 10. Colección: `inquiry_responses` (Respuestas a Consultas)
- **Name**: `inquiry_responses`
- **Type**: `Base`
- **Fields**:
    - `inquiry`: Relation (Single, Required) -> Collection: `inquiries`
    - `author`: Relation (Single, Required) -> Collection: `users`
    - `content`: Text (Required)
- **API Rules**:
    - **List/View**: `@request.auth.id != ""`
    - **Create**: `@request.auth.id != ""`
    - **Update**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`
    - **Delete**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`

## Datos de Ejemplo
Una vez creadas las colecciones y configuradas las reglas, puedes añadir algunos registros de prueba:

1. Crea una **Clase**: "Instalación y configuración"
2. Crea un **Link**: "Video de instalación" (url: https://youtube.com/..., class: [ID de la clase anterior])
