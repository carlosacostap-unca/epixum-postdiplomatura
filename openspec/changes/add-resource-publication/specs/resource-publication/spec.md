## Purpose

Permitir preparar y publicar individualmente los recursos de clases y trabajos prácticos, controlando su disponibilidad para estudiantes.

## ADDED Requirements

### Requirement: Publicación del trabajo práctico completo
El sistema MUST permitir a los gestores crear y editar trabajos prácticos completos como Borrador o Publicado. Los nuevos MUST iniciar en borrador y los existentes sin estado MUST conservarse publicados. Un trabajo en borrador MUST permanecer oculto para estudiantes junto con su consigna y recursos, incluso publicados, e impedir nuevas entregas y modificaciones estudiantiles de entregas existentes.

#### Scenario: Publicar un trabajo preparado
- **WHEN** el docente publica un trabajo práctico en borrador
- **THEN** los estudiantes con acceso al curso y unidad pueden verlo y entregar, pero sus recursos individuales en borrador continúan ocultos.

#### Scenario: Devolver trabajo a borrador
- **WHEN** un gestor cambia un trabajo publicado a borrador
- **THEN** los estudiantes no lo encuentran en listados ni acceden por URL directa, sus recursos quedan ocultos y se rechazan nuevas entregas, conservando las entregas existentes para gestión docente.

### Requirement: Gestión del estado de recursos
El sistema MUST permitir a administradores y docentes asignados crear y editar enlaces y archivos de clases y trabajos prácticos como Borrador o Publicado. Los recursos nuevos MUST iniciar en borrador salvo selección explícita; las ediciones sin cambio de estado MUST conservarlo.

#### Scenario: Preparar un recurso
- **WHEN** un gestor agrega un recurso sin seleccionar otro estado
- **THEN** queda en borrador y su estado aparece en el listado de gestión.

#### Scenario: Publicar y ocultar nuevamente
- **WHEN** un gestor cambia el estado entre publicado y borrador
- **THEN** cambia la disponibilidad del recurso para estudiantes y se conserva su contenido.

#### Scenario: Gestor ajeno
- **WHEN** un docente no asignado intenta editar el estado
- **THEN** se rechaza la operación.

### Requirement: Acceso estudiantil a recursos publicados
El sistema MUST NOT entregar recursos en borrador a estudiantes mediante listados, consultas directas por identificador ni nuevas descargas firmadas. Los recursos publicados MUST seguir exigiendo matrícula y visibilidad de la semana cuando corresponda.

#### Scenario: Borrador conocido por identificador
- **WHEN** un estudiante matriculado consulta directamente un recurso en borrador o solicita su descarga
- **THEN** no recibe el registro ni una nueva URL de descarga.

#### Scenario: Recurso publicado en semana oculta
- **WHEN** un estudiante consulta un recurso publicado dentro de una semana aún no disponible
- **THEN** no obtiene acceso al recurso.

### Requirement: Compatibilidad y supervisión
El sistema MUST mantener publicados los recursos anteriores sin estado explícito, mantener el comportamiento de los contenidos independientes y preservar la supervisión de solo lectura de los bedeles asignados.

#### Scenario: Recurso anterior
- **WHEN** se incorpora la función y un recurso no tiene estado
- **THEN** conserva su disponibilidad previa como publicado.

#### Scenario: Bedel asignado
- **WHEN** un bedel asignado consulta recursos desde la vista de supervisión
- **THEN** conserva acceso de lectura sin poder modificar el estado.
