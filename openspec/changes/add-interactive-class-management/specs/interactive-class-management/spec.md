## Purpose

Permitir a los docentes preparar materiales interactivos privados y asociarlos a encuentros de sus cursos antes de conducir sesiones con alumnos.

## ADDED Requirements

### Requirement: Habilitación administrativa por curso
El administrador MUST poder habilitar clases interactivas por curso, deshabilitadas por defecto. Deshabilitar MUST bloquear consulta y gestión docente sin borrar materiales. Los docentes MUST NOT cambiar esta opción, incluso mediante acceso directo a datos.

#### Scenario: Deshabilitar y reactivar
- **WHEN** el administrador deshabilita un curso con materiales y luego lo reactiva
- **THEN** los materiales se conservan y vuelven a aparecer al reactivar

#### Scenario: Cambio docente de la opción
- **WHEN** un docente intenta modificar la habilitación directamente
- **THEN** se rechaza la operación

### Requirement: Gestión privada y contextual
El sistema MUST ofrecer una biblioteca global y por curso a sus docentes asignados. Cada material MUST pertenecer a un curso habilitado y tener título, descripción opcional, estado y material opcional. Estudiantes y docentes ajenos MUST NOT consultar ni modificar materiales, aun con URL o acceso directo a datos.

#### Scenario: Borrador nuevo
- **WHEN** un docente asignado crea una clase interactiva con título en su curso habilitado
- **THEN** queda guardada como borrador aunque no tenga material ni clase asociada

#### Scenario: Acceso ajeno
- **WHEN** un estudiante o docente ajeno intenta listar, abrir, editar o eliminar un material
- **THEN** se rechaza el acceso sin exponer su contenido

### Requirement: Asociación a clases del mismo curso
El docente MUST poder asociar y desasociar materiales de clases habituales del mismo curso. El curso propietario MUST permanecer inmutable. Una clase MUST poder tener varios materiales y mostrar enlaces a su gestión.

#### Scenario: Clase ajena
- **WHEN** se intenta asociar una clase de otro curso
- **THEN** se rechaza y se conserva el material previo

#### Scenario: Clase eliminada
- **WHEN** se elimina una clase habitual asociada
- **THEN** el material se conserva y requiere nueva asociación para considerarse preparado

### Requirement: Importación validada y preparación
El sistema MUST importar materiales versionados con pantallas de contenido, opción múltiple de una respuesta correcta, encuestas y respuestas breves. MUST rechazar archivos inválidos, identificadores duplicados y soluciones inexistentes. Un material preparado MUST tener al menos una pantalla válida y una clase asociada. Preparar MUST NOT publicar a alumnos ni iniciar sesiones.

#### Scenario: Importación inválida
- **WHEN** el docente importa un archivo malformado o incompatible
- **THEN** recibe un error comprensible y se conserva el material previamente cargado

#### Scenario: Preparación incompleta
- **WHEN** el docente intenta preparar sin pantallas o sin clase
- **THEN** se solicita completar los datos faltantes

### Requirement: Vista previa docente
El docente autorizado MUST poder recorrer las pantallas y probar actividades sin persistir respuestas ni generar notas. El material MUST NOT ejecutar HTML o JavaScript arbitrario.

#### Scenario: Ensayo
- **WHEN** el docente abre la vista previa y responde una actividad
- **THEN** comprueba su funcionamiento localmente sin almacenar respuestas

#### Scenario: HTML importado
- **WHEN** el material contiene HTML o scripts
- **THEN** la vista previa no los ejecuta
