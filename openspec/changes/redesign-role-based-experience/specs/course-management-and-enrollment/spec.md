## MODIFIED Requirements

### Requirement: Administración de cursos
El sistema MUST permitir que un administrador cree, edite y elimine cursos con título, descripción, fechas, estado, docentes y relaciones de contenido, y MUST ofrecer búsqueda, filtrado y orden para localizar cursos al crecer el catálogo.

#### Scenario: Creación de curso
- **WHEN** un administrador envía un título y datos válidos
- **THEN** se crea un curso en estado seleccionado o `borrador`
- **AND** las fechas de día completo se normalizan de forma estable

#### Scenario: Exploración administrativa
- **WHEN** un administrador busca o filtra por título, estado o docente
- **THEN** la lista muestra únicamente los cursos coincidentes
- **AND** conserva visible la cantidad de resultados

#### Scenario: Eliminación de curso
- **WHEN** un administrador confirma en un diálogo la eliminación de un curso identificado
- **THEN** el curso se elimina y la lista administrativa se revalida

### Requirement: Mis cursos del estudiante
El panel del estudiante MUST obtener sus cursos exclusivamente desde `course_enrollments` y MUST ayudar a continuar el aprendizaje mediante estado, próxima actividad y acceso directo.

#### Scenario: Cursos matriculados
- **WHEN** un estudiante abre Mis cursos
- **THEN** aparecen solamente los cursos relacionados con matrículas propias
- **AND** cada tarjeta muestra su estado y permite ingresar al contenido autorizado

#### Scenario: Catálogo personal extenso
- **WHEN** el estudiante posee varios cursos
- **THEN** puede buscar por título y filtrar por estado sin ver cursos no matriculados

#### Scenario: Sin matrículas
- **WHEN** el estudiante no tiene registros de matrícula
- **THEN** se muestra un estado vacío que explica cómo obtener una clave
- **AND** la acción Sumarse a un curso queda disponible dentro del mismo contexto

### Requirement: Matrícula inmediata por clave
El sistema MUST matricular inmediatamente al estudiante cuando ingresa una clave válida de un curso no borrador y MUST comunicar el resultado dentro del flujo sin perder contexto.

#### Scenario: Clave correcta
- **WHEN** un estudiante autenticado ingresa una clave válida
- **THEN** se crea una matrícula única para ese estudiante y curso
- **AND** la interfaz confirma el nombre del curso y ofrece abrirlo inmediatamente

#### Scenario: Clave incorrecta o curso borrador
- **WHEN** la clave no coincide o el curso está en `borrador`
- **THEN** no se crea ninguna matrícula
- **AND** el campo conserva el foco y muestra un error accionable asociado

#### Scenario: Matrícula repetida
- **WHEN** el estudiante usa nuevamente la clave de un curso que ya posee
- **THEN** el sistema no duplica el registro
- **AND** comunica que ya estaba matriculado y ofrece abrir el curso

## ADDED Requirements

### Requirement: Resumen operativo del curso
La vista principal de un curso MUST ordenar clases, trabajos, consultas y participantes según las necesidades del rol y MUST mostrar conteos que enlacen al detalle correspondiente.

#### Scenario: Docente abre un curso
- **WHEN** un docente asignado ingresa a un curso
- **THEN** ve primero pendientes de revisión o consulta y acciones de creación
- **AND** puede acceder a clases, trabajos, estudiantes y clave de matrícula desde secciones identificables

#### Scenario: Estudiante abre un curso
- **WHEN** un estudiante matriculado ingresa a un curso
- **THEN** ve primero la próxima clase o trabajo pendiente
- **AND** mantiene acceso a todo el contenido publicado y al foro
