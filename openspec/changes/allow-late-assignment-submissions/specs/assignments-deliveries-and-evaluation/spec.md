## MODIFIED Requirements

### Requirement: Cierre por vencimiento
El sistema MUST bloquear primeras entregas y modificaciones después de la fecha y hora límite salvo que el trabajo permita entregas fuera de término o exista una corrección publicada que habilite el reenvío. La política MUST aplicarse en servidor y en interfaz para enlaces y archivos, conservando matrícula, visibilidad y propiedad. Una evaluación final aprobada o desaprobada MUST NOT reabrirse por esta opción.

#### Scenario: Plazo vencido sin autorización
- **WHEN** la hora del servidor supera el vencimiento y la opción está desactivada
- **THEN** la interfaz deshabilita la entrega y el servidor rechaza igualmente crear o modificar
- **AND** una corrección solicitada conserva la excepción existente de reenvío

#### Scenario: Plazo vencido con autorización
- **WHEN** el docente permite entregas fuera de término y un estudiante habilitado entrega después del vencimiento
- **THEN** se acepta el contenido sin cambiar la fecha límite
- **AND** la condición tardía se muestra al docente sin modificar nota ni veredicto

#### Scenario: Límite exacto y sin vencimiento
- **WHEN** se guarda exactamente a la hora límite o el trabajo no tiene vencimiento
- **THEN** la entrega se considera en término

#### Scenario: Cambio mientras se prepara el envío
- **WHEN** vence el plazo o se desactiva el permiso durante una captura o subida
- **THEN** el servidor aplica la política vigente al guardar, sin confiar en fechas o permisos del cliente

## ADDED Requirements

### Requirement: Configuración de entregas fuera de término
Administradores y docentes autorizados MUST poder activar y desactivar por trabajo la aceptación fuera de término en cualquier curso. La opción MUST estar desactivada por defecto y MUST NOT poder modificarse por estudiantes ni docentes ajenos al curso.

#### Scenario: Crear y editar
- **WHEN** un responsable crea o edita un práctico
- **THEN** puede marcar o desmarcar la casilla y guardar su valor sin alterar otras fechas o evaluaciones

#### Scenario: Registros anteriores
- **WHEN** un práctico anterior no tiene la opción configurada
- **THEN** conserva el bloqueo por vencimiento y no se habilita automáticamente

### Requirement: Identificación informativa de entregas tardías
El sistema MUST mostrar al docente una etiqueta Fuera de término en listado y detalle. Para nuevas versiones MUST conservar el vencimiento usado al entregar, sin recalcular la condición al extender posteriormente el plazo. Las versiones históricas MUST conservar su propia información y las evaluaciones existentes MUST permanecer intactas.

#### Scenario: Extensión posterior
- **WHEN** un trabajo se entrega tarde y luego se extiende su vencimiento
- **THEN** la versión registrada mantiene su etiqueta original

#### Scenario: Nueva versión
- **WHEN** se actualiza o reenvía una entrega
- **THEN** se registra su condición con el plazo vigente y se conserva la anterior en el historial

#### Scenario: Entrega heredada sin registro del plazo
- **WHEN** una entrega anterior no conserva el vencimiento al enviar
- **THEN** se puede indicar su condición comparando con el vencimiento actual, aclarando esa referencia sin inventar información histórica
