## Purpose

Ofrecer práctica individual por curso mediante cuestionarios simulados con corrección e historial, sin modificar las evaluaciones oficiales.

## ADDED Requirements

### Requirement: Activación por curso
El administrador MUST poder habilitar Preparación, inicialmente desactivada. Deshabilitarla MUST ocultar navegación y denegar operaciones conservando datos.

#### Scenario: Curso deshabilitado
- **WHEN** se deshabilita la sección
- **THEN** se rechazan accesos directos y no se borran intentos

### Requirement: Gestión docente
Los docentes asignados MUST poder crear, editar, publicar y archivar cuestionarios. Cada pregunta MUST tener dos a ocho opciones, una correcta y explicación opcional. Publicar MUST requerir preguntas válidas.

#### Scenario: Docente ajeno
- **WHEN** un docente de otro curso intenta gestionar un cuestionario
- **THEN** se rechaza la operación

### Requirement: Práctica y corrección
Los matriculados MUST poder repetir prácticas sin límite y recibir resultado, soluciones y explicaciones al finalizar. Las soluciones MUST NOT entregarse antes de finalizar. El servidor MUST calcular el resultado sin afectar notas oficiales.

#### Scenario: Finalización
- **WHEN** un alumno finaliza con opciones válidas o preguntas sin responder
- **THEN** se guardan aciertos y porcentaje y se muestra la revisión

### Requirement: Historial estable y privado
Los intentos MUST conservar la versión iniciada. Cada intento MUST tener un único resultado inmutable incluso ante envíos concurrentes. El alumno MUST ver sólo sus intentos; los docentes asignados MUST consultar resultados y respuestas del curso.

#### Scenario: Edición posterior
- **WHEN** cambia el cuestionario durante un intento
- **THEN** se corrige con la versión original

#### Scenario: Doble envío
- **WHEN** llegan dos finalizaciones para el mismo intento
- **THEN** permanece un único resultado que no se sobrescribe

#### Scenario: Acceso ajeno
- **WHEN** un alumno solicita el intento de otro
- **THEN** se rechaza el acceso
