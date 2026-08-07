# Trabajos prácticos, entregas y evaluación

## Purpose
Definir el ciclo completo de trabajos prácticos: publicación, entrega de proyectos, descarga docente, evaluación y devolución al estudiante.

## Requirements

### Requirement: Gestión de trabajos prácticos
Los docentes y administradores MUST poder crear, editar y eliminar trabajos prácticos con título, descripción, fecha límite, curso, recursos y prompt de evaluación opcional.

#### Scenario: Trabajo dentro de un curso
- **WHEN** un docente crea un trabajo desde un curso
- **THEN** el trabajo se relaciona con el curso
- **AND** se incorpora a la relación de trabajos del curso

#### Scenario: Fecha límite sin hora explícita
- **WHEN** se informa solamente el día de vencimiento
- **THEN** el sistema lo interpreta como el final de ese día

### Requirement: Una entrega por estudiante y trabajo
El sistema MUST mantener como máximo una entrega por combinación de estudiante y trabajo práctico.

#### Scenario: Primera entrega
- **WHEN** un estudiante matriculado entrega antes del vencimiento
- **THEN** se crea un registro relacionado con su identidad y el trabajo

#### Scenario: Segundo intento de creación
- **WHEN** ya existe una entrega para la misma combinación
- **THEN** el sistema rechaza un registro duplicado y ofrece modificar la entrega existente

### Requirement: Entrega de carpeta de proyecto
La interfaz MUST aceptar una carpeta de proyecto, comprimirla como ZIP en el navegador y subirla mediante una URL prefirmada antes de guardar la referencia.

#### Scenario: Carpeta válida
- **WHEN** el estudiante selecciona o arrastra una carpeta con archivos
- **THEN** la interfaz la comprime, sube el ZIP y registra su URL
- **AND** muestra progreso de compresión, subida y guardado

#### Scenario: Archivo suelto
- **WHEN** el estudiante intenta seleccionar o arrastrar un archivo suelto
- **THEN** la interfaz rechaza la selección y solicita una carpeta

### Requirement: Cierre por vencimiento
El estudiante MUST NOT crear ni modificar entregas después de la fecha límite del trabajo.

#### Scenario: Plazo vencido
- **WHEN** la hora actual supera `dueDate`
- **THEN** la interfaz deshabilita la entrega
- **AND** la acción del servidor rechaza igualmente el cambio

### Requirement: Revisión docente
Los docentes y administradores MUST poder listar las entregas, buscar por estudiante, descargar sus archivos y abrir el detalle de evaluación.

#### Scenario: Listado de entregas
- **WHEN** un docente abre un trabajo
- **THEN** ve estudiante, fecha, archivo y estado de evaluación de cada entrega

#### Scenario: Descarga docente
- **WHEN** solicita un archivo de una entrega
- **THEN** el servidor valida su rol y entrega una URL prefirmada temporal

### Requirement: Borrador y publicación de evaluación
Una evaluación MUST admitir nota, devolución, veredicto y estado `draft` o `published`.

#### Scenario: Guardado como borrador
- **WHEN** el docente guarda una evaluación con estado `draft`
- **THEN** puede continuar editándola
- **AND** el estudiante no ve todavía la devolución

#### Scenario: Publicación
- **WHEN** el docente cambia el estado a `published`
- **THEN** el estudiante ve nota, feedback y el veredicto `Aprobado` o `Corregir y reenviar`
