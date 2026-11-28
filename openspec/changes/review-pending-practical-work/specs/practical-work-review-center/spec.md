## Purpose

Facilitar a Administración la preevaluación con IA de trabajos prácticos pendientes y entregar el resultado al flujo de revisión docente.

## ADDED Requirements

### Requirement: Revisión administrativa de pendientes

El centro MUST limitar el acceso a administradores y mostrar únicamente entregas de trabajos prácticos con evaluación pendiente de publicación.

#### Scenario: Entregas de varios cursos
- **WHEN** Administración abre el centro
- **THEN** encuentra entregas nuevas, reenvíos y borradores, con un enlace a la revisión de cada entrega
- **AND** las evaluaciones publicadas y los parciales quedan fuera del listado

#### Scenario: Sin pendientes
- **WHEN** todas las evaluaciones están publicadas
- **THEN** el centro indica que no hay entregas pendientes

### Requirement: Preevaluación por entrega

El centro MUST generar automáticamente preevaluaciones de entregas pendientes con el servidor activo, aplicando los permisos, la configuración y los formatos que admite la preevaluación docente. La publicación MUST quedar a cargo del docente salvo activación explícita de la publicación automática por trabajo.

#### Scenario: Entrega elegible
- **WHEN** existe una entrega elegible en modo de preevaluación incluso con el centro cerrado
- **THEN** el resultado queda disponible en la revisión docente y la entrega sigue pendiente de publicación

#### Scenario: Intento equivalente
- **WHEN** ya existe un informe completo para la misma evidencia y versión de configuración
- **THEN** el centro reutiliza el resultado

#### Scenario: Recuperación del servidor
- **WHEN** el servidor vuelve a estar disponible con entregas pendientes ingresadas durante la interrupción
- **THEN** el proceso recorre esas entregas sin requerir una sesión de Administración

#### Scenario: Fallo del proveedor
- **WHEN** falla una generación automática ya iniciada
- **THEN** el intento queda registrado, las demás entregas siguen procesándose y se difiere el reintento durante una hora

#### Scenario: Entrega publicada o configuración inactiva
- **WHEN** el proceso revisa esa entrega
- **THEN** se omite la llamada al proveedor de IA

### Requirement: Publicación automática configurable por trabajo

Administración y los docentes asignados MUST poder elegir si las entregas pendientes reciben una preevaluación privada o una evaluación publicada. El modo predeterminado MUST ser la revisión docente.

#### Scenario: Activación explícita
- **WHEN** un responsable habilita la publicación automática y existe un informe completo para la entrega y rúbrica vigentes
- **THEN** el estudiante ve el veredicto, la devolución configurada y la nota cuando corresponde, y queda registrada la adopción automática

#### Scenario: Cambio durante el análisis
- **WHEN** se modifica la entrega o configuración, se desactiva la IA o un docente guarda un borrador o publica una evaluación
- **THEN** el proceso respeta el estado vigente y omite la publicación de ese informe
