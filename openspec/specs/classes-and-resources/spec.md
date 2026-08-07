# Clases y recursos

## Purpose
Definir la creación de clases dentro de un curso y la publicación de enlaces o archivos asociados a clases y trabajos prácticos.

## Requirements

### Requirement: Gestión de clases
Los docentes y administradores MUST poder crear, editar y eliminar clases con título, descripción, fecha y hora.

#### Scenario: Nueva clase de curso
- **WHEN** un docente autorizado crea una clase desde un curso
- **THEN** la clase queda relacionada directamente con ese curso
- **AND** la fecha y hora se almacenan como ISO

#### Scenario: Edición o eliminación
- **WHEN** un docente autorizado modifica o elimina una clase
- **THEN** el cambio se persiste y las vistas docentes relacionadas se revalidan

### Requirement: Orden cronológico para estudiantes
Las clases de un curso MUST mostrarse al estudiante en orden cronológico ascendente, dejando las clases sin fecha al final.

#### Scenario: Curso con varias clases
- **WHEN** el estudiante abre un curso con clases fechadas
- **THEN** ve primero la clase más antigua y luego las siguientes

### Requirement: Acceso condicionado por matrícula
Un estudiante MUST estar matriculado en el curso para abrir una clase o sus recursos.

#### Scenario: Acceso autorizado
- **WHEN** una matrícula propia relaciona al estudiante con el curso
- **THEN** puede consultar el detalle de la clase y descargar sus recursos

#### Scenario: URL de clase ajena
- **WHEN** un estudiante no matriculado intenta abrir una clase por URL
- **THEN** el sistema lo redirige a “Mis cursos”

### Requirement: Recursos vinculados
Los docentes y administradores MUST poder crear, actualizar y eliminar recursos de tipo `link` o `file`, asociados a una clase o a un trabajo práctico.

#### Scenario: Enlace externo
- **WHEN** el docente guarda título, URL y padre válido
- **THEN** se crea un recurso navegable desde el contenido correspondiente

#### Scenario: Archivo
- **WHEN** el docente carga un archivo
- **THEN** el sistema obtiene una URL prefirmada, almacena su referencia en `links` y permite una descarga autenticada

### Requirement: Descripción enriquecida
Las descripciones de cursos, clases y trabajos MUST admitir contenido enriquecido generado por el editor configurado.

#### Scenario: Contenido HTML guardado
- **WHEN** un docente guarda una descripción con formato
- **THEN** las vistas del curso o contenido conservan y presentan ese formato
