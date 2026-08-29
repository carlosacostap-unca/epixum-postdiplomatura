## MODIFIED Requirements

### Requirement: Gestión de trabajos prácticos
Los docentes y administradores MUST poder crear, editar y eliminar trabajos prácticos con título, descripción, fecha límite, curso y recursos. Cuando el curso tenga habilitada la IA, un docente asignado MUST poder activar y administrar una configuración estructurada de preevaluación sin exponerla a estudiantes.

#### Scenario: Trabajo dentro de un curso
- **WHEN** un docente crea un trabajo desde un curso
- **THEN** el trabajo se relaciona con el curso
- **AND** se incorpora a la relación de trabajos del curso

#### Scenario: Fecha límite sin hora explícita
- **WHEN** se informa solamente el día de vencimiento
- **THEN** el sistema lo interpreta como el final de ese día

#### Scenario: Curso con IA habilitada
- **WHEN** un docente asignado edita un trabajo de un curso habilitado
- **THEN** puede definir y activar su configuración de preevaluación
- **AND** estudiantes y docentes ajenos MUST NOT leer esa configuración

#### Scenario: Curso sin IA habilitada
- **WHEN** un docente edita un trabajo de un curso deshabilitado
- **THEN** la interfaz no permite activar la configuración de preevaluación
- **AND** cualquier configuración previa se conserva inactiva para una posible rehabilitación

### Requirement: Borrador y publicación de evaluación
Una evaluación MUST admitir nota opcional, devolución, veredicto `Aprobado`, `Desaprobado` o `Corregir y reenviar`, y estado `draft` o `published`.

#### Scenario: Guardado como borrador
- **WHEN** el docente guarda una evaluación con estado `draft`
- **THEN** puede continuar editándola
- **AND** el estudiante no ve todavía la devolución

#### Scenario: Publicación
- **WHEN** el docente cambia el estado a `published`
- **THEN** el estudiante ve la nota cuando corresponda, el feedback y el veredicto seleccionado

## ADDED Requirements

### Requirement: Entrega GitHub identificable
Una entrega por URL destinada a un trabajo con preevaluación activa MUST mostrar su repositorio normalizado, commit capturado y momento de captura a su estudiante propietario, docentes asignados y administradores.

#### Scenario: Entrega capturada
- **WHEN** el estudiante completa una entrega GitHub elegible
- **THEN** la vista confirma el repositorio y el SHA abreviado entregados
- **AND** conserva el SHA completo para procesamiento y auditoría

#### Scenario: Entrega no elegible
- **WHEN** la entrega contiene archivos o una URL que no representa un repositorio público de GitHub
- **THEN** continúa disponible en su flujo normal de revisión
- **AND** la interfaz MUST NOT ofrecer solicitar preevaluación

### Requirement: Flujo docente de preevaluación
El detalle docente de una entrega GitHub elegible MUST mostrar la capacidad de solicitar preevaluación, seguir su estado, consultar cobertura y resultado, editar la propuesta y decidir explícitamente si la traslada a la evaluación.

#### Scenario: Trabajo listo para preevaluar
- **WHEN** el curso y trabajo están habilitados, la configuración es válida y la entrega posee un commit capturado
- **THEN** el docente asignado ve la acción “Solicitar preevaluación con IA”

#### Scenario: Integración no disponible
- **WHEN** falta configuración del proveedor o un servicio externo no está disponible
- **THEN** la interfaz explica que no se pudo procesar la solicitud y permite reintentar cuando corresponda
- **AND** la evaluación manual permanece disponible

#### Scenario: Resultado disponible
- **WHEN** un intento finaliza correctamente
- **THEN** la interfaz diferencia la sugerencia de IA de la evaluación oficial
- **AND** muestra commit, cobertura, advertencias, veredicto, criterios y mensaje propuesto
