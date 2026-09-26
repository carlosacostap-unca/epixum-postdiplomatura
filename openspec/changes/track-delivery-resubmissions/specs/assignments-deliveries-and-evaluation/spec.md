## MODIFIED Requirements

### Requirement: Cierre por vencimiento
El estudiante MUST NOT crear ni modificar una entrega después de la fecha límite del trabajo, excepto cuando su última evaluación publicada tenga el veredicto `Corregir y reenviar`. Esa excepción MUST habilitar un único reenvío para el ciclo de corrección vigente.

#### Scenario: Plazo vencido sin corrección solicitada
- **WHEN** la hora actual supera `dueDate` y la entrega no posee una corrección publicada pendiente de reenvío
- **THEN** la interfaz deshabilita la creación o modificación de la entrega
- **AND** la acción del servidor rechaza igualmente el cambio

#### Scenario: Reenvío solicitado después del vencimiento
- **WHEN** la hora actual supera `dueDate` y la última evaluación publicada indica `Corregir y reenviar`
- **THEN** el estudiante propietario puede enviar una nueva versión
- **AND** la excepción se consume al registrar ese reenvío hasta que el docente publique otra corrección

### Requirement: Revisión docente
Los docentes asignados al curso y los administradores MUST poder listar las entregas, buscar por estudiante, descargar o abrir el intento vigente, consultar su historial y abrir el detalle de evaluación. Los reenvíos pendientes MUST formar parte de todos los contadores y listados de entregas por revisar.

#### Scenario: Listado de entregas
- **WHEN** un docente abre un trabajo
- **THEN** ve estudiante, fecha del intento vigente, modalidad y estado de evaluación de cada entrega
- **AND** distingue `Reenviado` de `Sin evaluar`, `Borrador` y los resultados publicados

#### Scenario: Filtro de reenvíos
- **WHEN** un docente filtra el listado por estado `Reenviado`
- **THEN** ve únicamente entregas cuyo intento vigente fue enviado después de una solicitud de corrección y todavía no tiene evaluación publicada

#### Scenario: Pendientes docentes
- **WHEN** existe un reenvío todavía no evaluado
- **THEN** los paneles global y del curso lo incluyen en `Entregas por revisar`
- **AND** enlazan al trabajo que contiene la entrega

#### Scenario: Descarga docente
- **WHEN** un docente autorizado solicita un archivo del intento vigente o de un intento histórico
- **THEN** el servidor valida su alcance sobre el curso y entrega una URL temporal

### Requirement: Borrador y publicación de evaluación
Cada intento vigente MUST admitir una evaluación con nota opcional, devolución, veredicto y estado `draft` o `published`. Una evaluación MUST quedar asociada a la versión concreta que el docente revisó y una evaluación o preevaluación de una versión anterior MUST NOT publicarse como evaluación del intento vigente.

#### Scenario: Guardado como borrador
- **WHEN** el docente guarda una evaluación con estado `draft`
- **THEN** puede continuar editándola para la versión vigente
- **AND** el estudiante no ve todavía ese borrador

#### Scenario: Publicación
- **WHEN** el docente publica una evaluación para la versión vigente
- **THEN** el estudiante ve la nota cuando corresponda, el feedback y el veredicto seleccionado
- **AND** la evaluación registra qué versión fue evaluada

#### Scenario: Intento cambiado durante la evaluación
- **WHEN** una evaluación o sugerencia de IA corresponde a una versión distinta de la entrega vigente
- **THEN** el sistema rechaza su publicación o adopción
- **AND** solicita revisar nuevamente el intento vigente

## ADDED Requirements

### Requirement: Ciclo de corrección y reenvío
El sistema MUST permitir un nuevo intento únicamente al estudiante propietario cuando la última evaluación publicada tenga el veredicto `Corregir y reenviar`. Registrar el reenvío MUST retirar la evaluación anterior del estado vigente, conservarla en el historial y devolver la entrega a revisión docente.

#### Scenario: Reenvío válido
- **WHEN** el estudiante propietario reenvía después de recibir `Corregir y reenviar`
- **THEN** el sistema registra una nueva versión con su propia fecha y contenido
- **AND** muestra `Reenviado · pendiente de revisión`
- **AND** la incorpora a la cola docente

#### Scenario: Entrega aprobada cerrada
- **WHEN** la última evaluación publicada tiene el veredicto `Aprobado`
- **THEN** el sistema muestra `Evaluado · aprobado`
- **AND** MUST NOT permitir nuevas modificaciones ni reenvíos

#### Scenario: Entrega desaprobada cerrada
- **WHEN** la última evaluación publicada tiene el veredicto `Desaprobado`
- **THEN** el sistema muestra el resultado publicado
- **AND** MUST NOT permitir nuevas modificaciones ni reenvíos

#### Scenario: Corrección reiterada
- **WHEN** el docente vuelve a publicar `Corregir y reenviar` sobre un reenvío
- **THEN** el estudiante puede iniciar otro ciclo de reenvío
- **AND** los ciclos anteriores permanecen en el historial

#### Scenario: Persona no autorizada
- **WHEN** una persona distinta del estudiante propietario intenta crear una versión o alterar su estado
- **THEN** el sistema MUST rechazar la operación aunque conozca el identificador de la entrega

### Requirement: Historial de intentos y devoluciones
El sistema MUST conservar en orden cronológico los intentos anteriores con su versión, fecha, contenido entregado y evaluación publicada cuando exista. El historial visible para el estudiante MUST excluir borradores docentes y datos privados de preevaluación.

#### Scenario: Espera posterior al reenvío
- **WHEN** el intento vigente está reenviado y pendiente
- **THEN** el estudiante sigue viendo la última devolución publicada bajo la identificación `Devolución anterior`
- **AND** la nueva versión no se presenta como evaluada

#### Scenario: Consulta del historial
- **WHEN** el estudiante propietario, un docente asignado o un administrador abre una entrega con intentos anteriores
- **THEN** ve cada versión en orden con su fecha y evaluación publicada correspondiente
- **AND** no ve borradores ni resultados internos de IA que no hayan sido publicados

#### Scenario: Compatibilidad con entregas existentes
- **WHEN** se despliega el nuevo modelo sobre una entrega histórica
- **THEN** el sistema la trata como versión inicial sin perder contenido ni evaluación
- **AND** los casos ambiguos de posible reenvío MUST quedar para confirmación explícita antes de cambiar su estado
