## MODIFIED Requirements

### Requirement: Administración de cursos
El sistema MUST permitir que un administrador cree, edite y elimine cursos con título, descripción, fechas, estado, docentes, relaciones de contenido y modalidad de organización `tradicional` o `semanal`; solamente un administrador MUST poder cambiar esa modalidad.

#### Scenario: Creación de curso
- **WHEN** un administrador envía un título y datos válidos
- **THEN** se crea un curso en estado seleccionado o `borrador`
- **AND** las fechas de día completo se normalizan de forma estable
- **AND** la modalidad queda en `tradicional` cuando no se elige otra explícitamente

#### Scenario: Activación de modalidad semanal
- **WHEN** un administrador configura un curso como `semanal`
- **THEN** los docentes asignados pueden comenzar a crear y organizar semanas
- **AND** el sistema no genera semanas automáticamente

#### Scenario: Cambio solicitado por otro rol
- **WHEN** un docente o estudiante intenta cambiar la modalidad del curso
- **THEN** las acciones del servidor y las reglas de datos rechazan la operación

#### Scenario: Regreso a modalidad tradicional
- **WHEN** un administrador cambia un curso semanal a `tradicional`
- **THEN** estudiantes y docentes vuelven a ver el contenido en listas únicas
- **AND** las semanas y relaciones existentes se conservan sin pérdida de datos

#### Scenario: Reactivación de modalidad semanal
- **WHEN** un administrador vuelve a configurar como `semanal` un curso que ya tenía semanas
- **THEN** se restaura la organización semanal previamente conservada

#### Scenario: Eliminación de curso
- **WHEN** un administrador confirma la eliminación
- **THEN** el curso se elimina y la lista administrativa se revalida
