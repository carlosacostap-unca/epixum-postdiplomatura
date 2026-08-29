## ADDED Requirements

### Requirement: Habilitación administrativa de preevaluación por curso
El sistema MUST permitir únicamente a un administrador habilitar o deshabilitar la preevaluación asistida por IA de cada curso. La configuración MUST estar deshabilitada por defecto para cursos nuevos y existentes.

#### Scenario: Curso nuevo sin selección explícita
- **WHEN** un administrador crea un curso sin habilitar la preevaluación
- **THEN** el curso se guarda con la capacidad deshabilitada

#### Scenario: Habilitación administrativa
- **WHEN** un administrador habilita la capacidad en un curso
- **THEN** los docentes asignados pueden configurar la preevaluación de sus trabajos
- **AND** los trabajos no configurados continúan disponibles para evaluación manual

#### Scenario: Deshabilitación posterior
- **WHEN** un administrador deshabilita la capacidad
- **THEN** desaparecen las acciones para solicitar nuevos intentos en ese curso
- **AND** se conservan configuraciones, intentos previos y evaluaciones existentes

#### Scenario: Cambio por actor no administrador
- **WHEN** un docente, estudiante o cliente no autorizado intenta modificar la habilitación
- **THEN** el servidor y las reglas persistentes rechazan la operación aunque no utilice el formulario administrativo
