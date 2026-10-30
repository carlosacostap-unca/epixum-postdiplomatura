## Purpose

Comunicar de forma individual y controlada el resultado final de cursada a cada alumno en los cursos que habilite la administración, conservando borradores e historial privado.

## ADDED Requirements

### Requirement: Habilitación administrativa opcional
Solamente administradores MUST habilitar resultados de cursada por curso. La función MUST estar desactivada por defecto y deshabilitarla MUST bloquear su gestión y consulta sin borrar resultados ni historial.

#### Scenario: Curso habilitado
- **WHEN** un administrador habilita resultados en un curso
- **THEN** sus docentes acceden a su gestión y sus alumnos pueden consultar su propio resultado publicado
- **AND** la habilitación no publica automáticamente resultados ni afecta otros cursos

#### Scenario: Deshabilitación y conservación
- **WHEN** un administrador deshabilita y luego rehabilita los resultados
- **THEN** los datos e historial permanecen y se recupera la visibilidad según permisos

#### Scenario: Cambio no autorizado
- **WHEN** un docente o alumno intenta cambiar la habilitación directamente
- **THEN** se rechaza la operación

### Requirement: Resultado individual definido por el equipo docente
Administradores y docentes asignados MUST poder guardar un resultado por alumno con matrícula vigente y sin asignación docente en ese curso. El estado MUST ser Aprobado, No aprobado o No completó. La nota de 0 a 10 y la devolución de hasta 5000 caracteres MUST ser opcionales, y la nota cero MUST distinguirse de una nota ausente. El estado MUST ser una decisión explícita y MUST NOT inferirse automáticamente de actividades o notas.

#### Scenario: Guardado válido
- **WHEN** un docente asignado guarda un estado válido con nota y devolución opcionales
- **THEN** se conserva un borrador individual sin hacerlo visible al alumno

#### Scenario: Entrada inválida o fuera de alcance
- **WHEN** una persona intenta asignar un estado distinto, una nota inválida, un alumno de otro curso o un curso sin permisos
- **THEN** se rechaza la operación sin escrituras parciales

### Requirement: Publicación individual y correcciones
El resultado MUST requerir publicación explícita por alumno. Una corrección guardada como borrador MUST conservar la versión publicada hasta que se publique la nueva versión. El equipo autorizado MUST poder retirar la publicación sin eliminar el resultado ni su historial. Los cambios simultáneos MUST NOT sobrescribirse silenciosamente.

#### Scenario: Publicación inicial
- **WHEN** el docente publica la versión guardada de un alumno
- **THEN** solamente ese alumno puede ver el estado, nota y devolución publicados en el resumen del curso

#### Scenario: Corrección pendiente
- **WHEN** el docente guarda una corrección de un resultado publicado
- **THEN** el alumno sigue viendo la versión publicada anterior hasta la nueva publicación

#### Scenario: Edición concurrente
- **WHEN** dos docentes intentan modificar la misma versión
- **THEN** se confirma una única modificación y se informa el conflicto al otro sin perder historial

### Requirement: Privacidad y conservación del historial
El alumno MUST poder consultar exclusivamente su resultado publicado y MUST NOT obtener borradores, historial, identidades de editores ni listados o resultados de otros alumnos, incluso por solicitudes directas. Administradores y docentes asignados MUST disponer de un historial de guardados, publicaciones y retiros con autor, fecha y contenido. Retirar la matrícula MUST revocar el acceso estudiantil y MUST NOT borrar resultados ni historial.

#### Scenario: Consulta propia
- **WHEN** un alumno matriculado abre el resumen de un curso habilitado
- **THEN** recibe solo su resultado publicado o un aviso de que aún no se publicó

#### Scenario: Solicitud de información ajena
- **WHEN** un alumno intenta acceder a la gestión, historial o resultado de otro alumno
- **THEN** el sistema rechaza el acceso sin exponer datos

#### Scenario: Retiro de matrícula
- **WHEN** se retira una matrícula
- **THEN** la persona pierde el acceso a su resultado mientras los datos e historial permanecen almacenados
