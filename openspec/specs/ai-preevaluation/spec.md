# Preevaluación asistida por IA

## Purpose
Definir la generación estructurada de una sugerencia de evaluación para una entrega, conservando al docente como responsable de la decisión final.

## Requirements

### Requirement: Acceso docente a la IA
Solo docentes y administradores MUST poder solicitar una preevaluación de una entrega.

#### Scenario: Solicitud autorizada
- **WHEN** un docente autenticado abre el detalle de una entrega y solicita preevaluar
- **THEN** el servidor puede invocar el proveedor OpenAI

#### Scenario: Solicitud de estudiante
- **WHEN** un estudiante intenta invocar la acción
- **THEN** el sistema responde “No autorizado” sin llamar al proveedor

### Requirement: Configuración del prompt
Cada trabajo práctico MUST poder guardar un `systemPrompt` que guíe la preevaluación junto con el contenido preparado de la entrega.

#### Scenario: Prompt configurado
- **WHEN** el docente solicita una preevaluación
- **THEN** la acción envía el prompt de sistema y la evidencia de la entrega como mensajes separados

### Requirement: Respuesta estructurada
La integración MUST solicitar una respuesta JSON estricta con `nota`, `devolucion` y `verdicto`.

#### Scenario: Respuesta válida
- **WHEN** OpenAI devuelve contenido compatible con el esquema
- **THEN** la interfaz recibe una nota numérica, devolución textual y uno de los veredictos permitidos

#### Scenario: Respuesta ausente o inválida
- **WHEN** el proveedor no devuelve contenido utilizable
- **THEN** la acción informa el error y no publica una evaluación incompleta

### Requirement: Revisión humana antes de publicar
La salida de IA MUST ser una propuesta editable y MUST NOT publicarse automáticamente al estudiante.

#### Scenario: Docente acepta o corrige sugerencia
- **WHEN** se genera la preevaluación
- **THEN** el docente puede ajustar nota, devolución y veredicto
- **AND** decide guardarla como borrador o publicarla mediante el flujo normal de evaluación

### Requirement: Configuración secreta
La clave `OPENAI_API_KEY` MUST permanecer en el servidor y MUST NOT incluirse en respuestas, archivos versionados ni código del cliente.

#### Scenario: Clave no configurada
- **WHEN** falta la variable del servidor
- **THEN** la acción informa que la integración no está configurada y no intenta la llamada
