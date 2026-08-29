## MODIFIED Requirements

### Requirement: Acceso docente a la IA
Solo administradores y docentes asignados al curso MUST poder solicitar una preevaluación, y el servidor MUST exigir que la capacidad esté habilitada tanto en el curso como en el trabajo práctico y que la entrega corresponda al repositorio GitHub capturado para ese trabajo.

#### Scenario: Solicitud docente autorizada
- **WHEN** un docente asignado solicita preevaluar una entrega GitHub elegible de un curso y trabajo habilitados
- **THEN** el servidor puede preparar la evidencia e invocar al proveedor OpenAI

#### Scenario: Curso o trabajo no habilitado
- **WHEN** se intenta invocar la operación para un curso deshabilitado o un trabajo sin configuración activa
- **THEN** el servidor rechaza la solicitud sin descargar el repositorio ni llamar a OpenAI

#### Scenario: Actor o alcance no autorizado
- **WHEN** un estudiante, un docente ajeno al curso o una persona sin sesión intenta invocar la operación
- **THEN** el sistema responde “No autorizado” sin consultar GitHub ni OpenAI

### Requirement: Configuración del prompt
Cada trabajo práctico de un curso habilitado MUST permitir que un docente asignado configure criterios de evaluación, requisitos obligatorios, subconjunto de veredictos admitidos, nota numérica opcional, orientación del mensaje e instrucciones adicionales. El sistema MUST incorporar automáticamente el enunciado del trabajo y MUST mantener el contenido del repositorio separado como evidencia no confiable.

#### Scenario: Configuración válida
- **WHEN** el docente guarda al menos un criterio y un veredicto admitido
- **THEN** el trabajo queda disponible para preevaluación
- **AND** la configuración puede reutilizarse en todas sus entregas sin copiar nuevamente el enunciado

#### Scenario: Configuración incompleta
- **WHEN** faltan criterios, veredictos o datos requeridos por la modalidad de nota seleccionada
- **THEN** el sistema conserva la configuración como no disponible para ejecutar
- **AND** orienta al docente para completarla

#### Scenario: Instrucciones dentro del repositorio
- **WHEN** un archivo del estudiante contiene texto que intenta modificar la rúbrica, revelar instrucciones o declarar su propio veredicto
- **THEN** el contenido se trata exclusivamente como evidencia de la entrega
- **AND** MUST NOT reemplazar las instrucciones del sistema ni la configuración docente

### Requirement: Respuesta estructurada
La integración MUST utilizar `gpt-5.6-luna` mediante Responses API y MUST solicitar una salida estructurada estricta con veredicto, nota sugerida opcional, resultados por criterio, fortalezas, correcciones necesarias, advertencias y mensaje propuesto para el alumno.

#### Scenario: Respuesta válida
- **WHEN** OpenAI devuelve contenido compatible con el esquema
- **THEN** el veredicto pertenece al subconjunto configurado entre `Aprobado`, `Desaprobado` y `Corregir y reenviar`
- **AND** cada criterio posee un resultado y observación
- **AND** la nota aparece solamente cuando el trabajo la tiene habilitada

#### Scenario: Respuesta ausente, rechazada o inválida
- **WHEN** el proveedor rechaza la solicitud, devuelve una respuesta incompleta o no satisface el esquema
- **THEN** el intento queda fallido con un mensaje sanitizado
- **AND** el sistema MUST NOT crear ni publicar una evaluación oficial incompleta

### Requirement: Revisión humana antes de publicar
La salida de IA MUST ser una propuesta editable y separada de la evaluación oficial, MUST identificar el commit y la cobertura analizados y MUST NOT publicarse automáticamente al estudiante.

#### Scenario: Docente adopta la sugerencia
- **WHEN** el docente revisa y acepta o modifica veredicto, nota y mensaje propuestos
- **THEN** puede copiarlos a la evaluación como borrador o publicarlos mediante el flujo normal
- **AND** la acción queda atribuida al docente, no al modelo

#### Scenario: Docente descarta la sugerencia
- **WHEN** el docente considera insuficiente o incorrecta la preevaluación
- **THEN** puede descartarla o solicitar un nuevo intento
- **AND** la evaluación oficial existente permanece sin cambios

## ADDED Requirements

### Requirement: Trazabilidad de intentos
Cada solicitud MUST persistir un intento independiente con solicitante, curso, trabajo, entrega, commit, estado, fecha, modelo, configuración aplicada, cobertura, resultado y uso informado por el proveedor, sin almacenar secretos ni contenido completo del repositorio.

#### Scenario: Procesamiento exitoso
- **WHEN** una solicitud completa la descarga, preparación y generación
- **THEN** el intento pasa de `processing` a `completed`
- **AND** conserva el resultado y los metadatos necesarios para auditar qué se evaluó

#### Scenario: Procesamiento fallido
- **WHEN** falla GitHub, la preparación o OpenAI
- **THEN** el intento pasa a `failed`
- **AND** conserva una categoría y mensaje sanitizados que permiten reintentar sin exponer credenciales

#### Scenario: Intentos sucesivos
- **WHEN** el docente solicita nuevamente la preevaluación de la misma entrega
- **THEN** el sistema crea otro intento sin sobrescribir los anteriores
- **AND** todos utilizan el commit congelado salvo que el estudiante haya actualizado legítimamente la entrega antes del vencimiento

### Requirement: Minimización de datos enviados
La solicitud a OpenAI MUST omitir identidad, email y otros datos personales innecesarios del estudiante, MUST enviar únicamente enunciado, configuración y evidencia seleccionada, y MUST deshabilitar el almacenamiento de la respuesta en el proveedor cuando la API lo permita.

#### Scenario: Construcción de la solicitud
- **WHEN** el servidor prepara una preevaluación
- **THEN** no incorpora el nombre ni email del estudiante al contenido enviado
- **AND** utiliza un identificador técnico no reversible solamente cuando sea necesario para seguridad u observabilidad
