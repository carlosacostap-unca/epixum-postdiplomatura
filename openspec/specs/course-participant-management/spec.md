# Administración de participantes por curso

## Purpose

Definir una experiencia administrativa clara, accesible y segura para gestionar alumnos, docentes e invitaciones dentro de cada curso.

## Requirements

### Requirement: Superficie de participantes por curso
El sistema MUST ofrecer a los administradores una superficie específica dentro de cada curso que muestre por separado alumnos matriculados, docentes asignados e invitaciones, con conteos, búsqueda, estados vacíos y acciones contextualizadas.

#### Scenario: Consulta de participantes
- **WHEN** un administrador abre la sección Participantes de un curso
- **THEN** ve la cantidad de alumnos, docentes e invitaciones asociadas
- **AND** puede alternar entre cada grupo sin abandonar el contexto del curso

#### Scenario: Búsqueda dentro del curso
- **WHEN** el administrador busca por nombre o correo dentro de alumnos o docentes
- **THEN** la lista muestra solamente las personas coincidentes que poseen esa participación en el curso
- **AND** comunica la cantidad de resultados

#### Scenario: Presentación responsive
- **WHEN** la superficie se utiliza en una pantalla angosta
- **THEN** los participantes y sus acciones se presentan en tarjetas legibles sin perder información ni funcionalidad esencial

### Requirement: Incorporación accesible de participantes
El sistema MUST permitir que un administrador busque y seleccione una o varias cuentas existentes para incorporarlas como alumnas o docentes, MUST excluir las participaciones ya vigentes y MUST explicar por qué una cuenta incompatible no puede seleccionarse.

#### Scenario: Agregar alumnos existentes
- **WHEN** el administrador selecciona cuentas existentes que no enseñan en el curso y confirma Agregar alumnos
- **THEN** el sistema crea una matrícula única para cada persona seleccionada
- **AND** actualiza la lista y el conteo con confirmación de éxito

#### Scenario: Agregar docentes existentes
- **WHEN** el administrador selecciona cuentas existentes que no están matriculadas en el curso y confirma Agregar docentes
- **THEN** el sistema incorpora esas identidades a la relación docente del curso
- **AND** conserva sus matrículas y asignaciones en otros cursos

#### Scenario: Candidato incompatible
- **WHEN** una cuenta ya posee la participación opuesta dentro del mismo curso
- **THEN** el selector la muestra deshabilitada o la excluye con una explicación accesible
- **AND** ninguna participación existente se elimina o convierte automáticamente

#### Scenario: Identidad sin cuenta
- **WHEN** el administrador necesita incorporar a una persona que todavía no posee cuenta
- **THEN** la interfaz orienta al flujo de invitaciones disponible
- **AND** no simula que Epixum enviará un email

### Requirement: Retiro seguro de participantes
El sistema MUST permitir que un administrador retire una matrícula o asignación docente mediante una confirmación que identifique persona, curso, participación e impacto, y MUST conservar la cuenta y toda su actividad histórica.

#### Scenario: Retirar alumno
- **WHEN** el administrador confirma retirar a un alumno matriculado
- **THEN** el sistema elimina únicamente la matrícula de esa persona en el curso
- **AND** conserva sus entregas, consultas, respuestas, evaluaciones y archivos existentes

#### Scenario: Retirar docente
- **WHEN** el administrador confirma retirar a un docente asignado
- **THEN** el sistema elimina únicamente su asignación docente en ese curso
- **AND** conserva sus otras participaciones y el contenido histórico del curso

#### Scenario: Participación modificada concurrentemente
- **WHEN** la participación dejó de existir antes de la confirmación
- **THEN** el sistema no elimina otros datos
- **AND** actualiza la interfaz con un mensaje comprensible sobre el estado vigente

### Requirement: Interacción accesible y recuperable
La administración de participantes MUST funcionar con teclado, MUST gestionar el foco al abrir y cerrar diálogos, MUST anunciar carga, éxito y error, y MUST impedir confirmaciones repetidas mientras una operación está en curso.

#### Scenario: Diálogo de incorporación
- **WHEN** el administrador abre el selector de personas usando teclado
- **THEN** el foco se mueve al buscador y puede recorrer, seleccionar, confirmar o cancelar sin utilizar un puntero
- **AND** al cerrar regresa al control que abrió el diálogo

#### Scenario: Error de mutación
- **WHEN** una incorporación o retiro no puede completarse
- **THEN** el diálogo permanece en un estado recuperable
- **AND** el error se anuncia sin perder la selección ni el contexto del curso
