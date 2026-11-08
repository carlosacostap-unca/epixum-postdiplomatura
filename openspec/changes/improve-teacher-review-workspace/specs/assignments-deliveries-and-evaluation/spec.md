## MODIFIED Requirements

### Requirement: Revisión docente
Los docentes asignados al curso y los administradores MUST poder listar las entregas, buscar por estudiante, descargar sus archivos y abrir el detalle de evaluación. Los pendientes MUST enlazar directamente a la entrega correspondiente. El detalle MUST reunir el material entregado y la evaluación, en columnas en escritorio y apilados en móvil, con contexto del curso, trabajo y estudiante.

#### Scenario: Listado de entregas
- **WHEN** un docente abre un trabajo
- **THEN** ve estudiante, fecha, archivo y estado de evaluación de cada entrega
- **AND** puede abrir directamente la corrección conservando búsqueda y estado seleccionados

#### Scenario: Descarga docente
- **WHEN** solicita un archivo de una entrega
- **THEN** el servidor valida su rol y entrega una URL prefirmada temporal

#### Scenario: Corrección consecutiva
- **WHEN** un docente abre una entrega desde un listado filtrado
- **THEN** puede pasar a la entrega anterior o siguiente del mismo trabajo que corresponde a esos filtros
- **AND** puede regresar al listado con los filtros conservados
- **AND** cada acceso valida nuevamente que pertenece al curso y al trabajo autorizados

#### Scenario: Cambios locales sin guardar
- **WHEN** el docente modifica su evaluación e intenta usar los controles de navegación de la corrección
- **THEN** el sistema permite seguir editando o confirmar que quiere salir sin guardar
- **AND** no publica ni guarda automáticamente

#### Scenario: Guardado confirmado
- **WHEN** el servidor confirma un guardado o publicación
- **THEN** el detalle muestra el estado actualizado y deja de advertir sobre los cambios ya guardados
- **AND** una publicación conserva la confirmación explícita y la validación de versión vigente
