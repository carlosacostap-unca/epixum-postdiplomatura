# Cursos y matrículas

## Purpose
Definir el ciclo de vida de cursos, su asignación docente y la matriculación inmediata de estudiantes mediante claves seguras.

## Requirements

### Requirement: Administración de cursos
El sistema MUST permitir que un administrador cree, edite y elimine cursos con título, descripción, fechas, estado, docentes y relaciones de contenido.

#### Scenario: Creación de curso
- **WHEN** un administrador envía un título y datos válidos
- **THEN** se crea un curso en estado seleccionado o `borrador`
- **AND** las fechas de día completo se normalizan de forma estable

#### Scenario: Eliminación de curso
- **WHEN** un administrador confirma la eliminación
- **THEN** el curso se elimina y la lista administrativa se revalida

### Requirement: Configuración administrativa de contenidos independientes
El sistema MUST permitir únicamente a un administrador habilitar o deshabilitar los contenidos independientes de cada curso. La configuración MUST estar deshabilitada por defecto para cursos nuevos y existentes.

#### Scenario: Creación de curso
- **WHEN** un administrador crea un curso sin habilitar explícitamente los contenidos independientes
- **THEN** el curso se guarda con la característica deshabilitada

#### Scenario: Cambio administrativo
- **WHEN** un administrador edita un curso y cambia la configuración de contenidos independientes
- **THEN** el nuevo valor se aplica a las vistas y accesos de docentes y estudiantes

#### Scenario: Actor no administrador
- **WHEN** un docente o estudiante intenta cambiar la configuración directamente
- **THEN** el sistema rechaza la operación aunque la solicitud evite el formulario administrativo

#### Scenario: Compatibilidad de cursos existentes
- **WHEN** se incorpora la configuración a un curso existente
- **THEN** su valor inicial es deshabilitado
- **AND** sus clases, trabajos, semanas, consultas y matrículas permanecen sin cambios

### Requirement: Alcance docente
Un docente MUST ver y gestionar solamente los cursos en cuya relación `teachers` se encuentra asignado.

#### Scenario: Curso asignado
- **WHEN** un docente abre uno de sus cursos
- **THEN** ve sus clases, trabajos, consultas, alumnos matriculados y gestor de clave

#### Scenario: Curso no asignado
- **WHEN** un docente intenta abrir por URL un curso ajeno
- **THEN** el sistema lo redirige a su panel

### Requirement: Mis cursos del estudiante
El panel del estudiante MUST obtener sus cursos exclusivamente desde `course_enrollments`.

#### Scenario: Cursos matriculados
- **WHEN** un estudiante abre “Mis cursos”
- **THEN** aparecen solamente los cursos relacionados con matrículas propias
- **AND** cada tarjeta permite ingresar al contenido autorizado

#### Scenario: Sin matrículas
- **WHEN** el estudiante no tiene registros de matrícula
- **THEN** se muestra un estado vacío y la acción “Sumarme a un curso”

### Requirement: Matrícula inmediata por clave
El sistema MUST matricular inmediatamente al estudiante cuando ingresa una clave válida de un curso no borrador.

#### Scenario: Clave correcta
- **WHEN** un estudiante autenticado ingresa una clave válida
- **THEN** se crea una matrícula única para ese estudiante y curso
- **AND** el nuevo curso aparece en “Mis cursos” sin aprobación manual

#### Scenario: Clave incorrecta o curso borrador
- **WHEN** la clave no coincide o el curso está en `borrador`
- **THEN** no se crea ninguna matrícula
- **AND** la interfaz informa que la clave no corresponde a un curso disponible

#### Scenario: Matrícula repetida
- **WHEN** el estudiante usa nuevamente la clave de un curso que ya posee
- **THEN** el sistema no duplica el registro
- **AND** comunica que ya estaba matriculado

### Requirement: Protección y rotación de claves
Las claves MUST tener entre 6 y 64 caracteres, MUST compararse normalizadas sin distinguir mayúsculas y MUST almacenarse únicamente como HMAC-SHA256 con un secreto de servidor.

#### Scenario: Docente cambia una clave
- **WHEN** un docente asignado guarda una nueva clave válida
- **THEN** se reemplaza `enrollmentKeyHash`
- **AND** la clave anterior deja de matricular inmediatamente

#### Scenario: Exposición de datos
- **WHEN** se consulta un curso o una matrícula mediante la API normal
- **THEN** PocketBase no serializa los hashes marcados como ocultos

### Requirement: Ausencia de solicitudes manuales
El sistema MUST NOT crear, mostrar ni procesar formularios o solicitudes de matrícula pendientes.

#### Scenario: Flujo vigente
- **WHEN** una persona busca sumarse a un curso
- **THEN** la única vía funcional es la clave inmediata
- **AND** no existe la colección `enrollment_requests`
