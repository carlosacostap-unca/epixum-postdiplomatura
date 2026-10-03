## ADDED Requirements

### Requirement: Informe completo editable al adoptar IA

Al generar una nueva preevaluación o preparar una sugerencia sin devolución guardada, el sistema MUST proponer al docente o administrador autorizado una devolución que incluya el mensaje, todos los criterios con resultado y observación, fortalezas, correcciones, advertencias y cobertura disponible. El informe MUST indicar el commit y la versión de rúbrica utilizados, incluir descripción y peso de los criterios cuando estén disponibles y explicar el alcance estático sin inventar pasos internos ni puntuaciones por criterio. El docente MUST poder editar todo el texto y confirmar la publicación.

#### Scenario: Nueva sugerencia completa
- **WHEN** un docente asignado obtiene una preevaluación completada
- **THEN** el formulario propone el informe íntegro y permite editarlo antes de guardar un borrador o publicarlo
- **AND** sólo el texto confirmado se publica al alumno propietario

#### Scenario: Cobertura parcial
- **WHEN** la evidencia incluye archivos omitidos
- **THEN** el informe muestra todos los archivos incluidos y los motivos de omisión, explicando que un archivo omitido no equivale a un faltante del repositorio

### Requirement: Compatibilidad y privacidad de las devoluciones

El sistema MUST conservar las devoluciones guardadas y las evaluaciones manuales sin reescritura automática. El informe publicado MUST persistir con la devolución confirmada y mantenerse en el historial de su versión. El sistema MUST NOT abrir el acceso estudiantil a intentos privados, secretos, uso del proveedor ni datos administrativos, y MUST mantener autorización docente, validación de versión y commit antes de publicar.

#### Scenario: Evaluación previa
- **WHEN** el docente abre una evaluación ya publicada o un borrador guardado
- **THEN** conserva su texto sin sustitución por el informe generado

#### Scenario: Lectura estudiantil
- **WHEN** un alumno propietario consulta su evaluación publicada
- **THEN** ve el informe completo confirmado sin necesitar acceso a la colección privada de IA

#### Scenario: Versión anterior
- **WHEN** el alumno reenvía su entrega después de una devolución completa
- **THEN** el historial conserva el texto completo correspondiente a la versión evaluada

#### Scenario: Sugerencia desactualizada o docente ajeno
- **WHEN** se intenta adoptar una sugerencia de otro commit o publicar sin autorización sobre el curso
- **THEN** el sistema rechaza la operación sin modificar la entrega
