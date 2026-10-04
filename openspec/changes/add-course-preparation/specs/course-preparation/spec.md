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
Los matriculados MUST poder repetir prácticas sin límite y recibir devolución al confirmar cada pregunta. Las soluciones de preguntas pendientes MUST NOT entregarse. Cada respuesta confirmada MUST quedar guardada e inmutable. El servidor MUST calcular un resumen completo al responder todas las preguntas, sin afectar notas oficiales.

#### Scenario: Finalización
- **WHEN** un alumno confirma todas las respuestas válidas
- **THEN** se guardan aciertos y porcentaje y se muestra la revisión

#### Scenario: Devolución inmediata
- **WHEN** el alumno confirma una respuesta
- **THEN** se guarda antes de mostrar su corrección y explicación, sin revelar soluciones pendientes

### Requirement: Reanudación persistente
El progreso MUST persistir en el servidor. Al volver a un intento abierto con respuestas, el alumno MUST poder continuar desde la primera pregunta pendiente o crear un intento nuevo conservando el anterior.

#### Scenario: Cambio de dispositivo
- **WHEN** el alumno entra desde otra sesión autenticada
- **THEN** recupera las respuestas confirmadas y puede continuar sin depender de almacenamiento local

#### Scenario: Respuestas simultáneas
- **WHEN** se confirma la misma pregunta desde dos pestañas
- **THEN** se conserva una única respuesta y ambas reciben la devolución de la respuesta persistida

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
