## Purpose

Permitir consultas diseñadas por docentes a los alumnos de cursos autorizados, con participación única y resultados que respeten la modalidad de privacidad elegida.

## ADDED Requirements

### Requirement: Habilitación administrativa por curso
Solamente administradores MUST habilitar o deshabilitar las encuestas de cada curso. La función MUST estar deshabilitada por defecto y deshabilitarla MUST bloquear accesos sin borrar encuestas, participaciones ni respuestas.

#### Scenario: Activación selectiva
- **WHEN** un administrador habilita las encuestas en un curso
- **THEN** sus docentes y alumnos ven la sección Encuestas sin habilitarla en otros cursos

#### Scenario: Desactivación y reactivación
- **WHEN** un administrador deshabilita y luego rehabilita la función
- **THEN** los datos se conservan y vuelven a estar disponibles según sus permisos

#### Scenario: Intento docente de habilitación
- **WHEN** un docente intenta cambiar la habilitación mediante una solicitud directa
- **THEN** el sistema rechaza el cambio

### Requirement: Autoría y ciclo de vida
Administradores y docentes asignados MUST poder crear, editar y eliminar borradores, publicar, cerrar y duplicar encuestas del curso habilitado. El diseño MUST admitir título, descripción, orden, preguntas obligatorias u opcionales y los tipos opción única, selección múltiple, escala de 1 a 5 y texto. Las preguntas y la modalidad de privacidad MUST quedar fijas al publicar, y una fecha de cierre opcional MUST impedir nuevas respuestas al cumplirse.

#### Scenario: Diseño válido
- **WHEN** un docente asignado guarda un borrador con preguntas válidas y lo publica
- **THEN** los alumnos matriculados pueden responder el diseño publicado

#### Scenario: Modificación publicada
- **WHEN** un docente intenta cambiar las preguntas de una encuesta publicada o cerrada
- **THEN** el sistema rechaza el cambio y permite duplicarla como nuevo borrador

#### Scenario: Acceso fuera de alcance
- **WHEN** una persona intenta gestionar encuestas de otro curso o con la función deshabilitada
- **THEN** se rechaza tanto la página como la acción directa

### Requirement: Participación estudiantil única
Solo alumnos con matrícula vigente, sin asignación docente en el mismo curso y en un curso no borrador MUST responder encuestas publicadas y abiertas. El servidor MUST validar las preguntas obligatorias y los valores recibidos y MUST persistir como máximo una respuesta por alumno y encuesta, incluso ante envíos simultáneos o reintentos. Los estudiantes MUST NOT acceder a borradores ni respuestas ajenas.

#### Scenario: Envío válido
- **WHEN** un alumno matriculado responde todas las preguntas obligatorias con valores válidos
- **THEN** se guarda su participación y se confirma el envío

#### Scenario: Reintento concurrente
- **WHEN** un alumno envía dos veces simultáneamente
- **THEN** se conserva una sola participación y una sola respuesta completa

#### Scenario: Encuesta cerrada o datos inválidos
- **WHEN** un alumno intenta responder después del cierre, sin matrícula o con valores inválidos
- **THEN** se rechaza el envío sin guardar una participación parcial

### Requirement: Privacidad y resultados
El docente MUST elegir modalidad identificada o anónima antes de publicar. La modalidad anónima MUST separar el control de participación del contenido y MUST NOT exponer identidades, marcas de tiempo, identificadores correlacionables ni orden de envío en los resultados. Administradores y docentes asignados MUST ver cantidad de respuestas, conteos y porcentajes por opción y respuestas abiertas; en modalidad identificada MUST poder consultar además las respuestas por alumno. Los alumnos MUST NOT consultar resultados del grupo.

#### Scenario: Resultados anónimos
- **WHEN** un docente abre resultados de una encuesta anónima
- **THEN** ve agregados y textos sin vincularlos a participantes ni a metadatos de envío

#### Scenario: Resultados identificados
- **WHEN** un docente abre resultados de una encuesta identificada
- **THEN** ve agregados y respuestas individuales con el nombre del alumno
