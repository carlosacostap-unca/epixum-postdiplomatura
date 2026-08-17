## ADDED Requirements

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
