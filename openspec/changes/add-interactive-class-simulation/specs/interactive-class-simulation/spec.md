## Purpose

Permitir a los docentes ensayar una clase interactiva con participantes ficticios y resultados temporales antes del encuentro real.

## ADDED Requirements

### Requirement: Acceso docente al ensayo
El sistema MUST ofrecer simulación para cada clase con material válido, incluidos borradores sin clase asociada, únicamente a docentes asignados al curso habilitado.

#### Scenario: Material válido en borrador
- **WHEN** el docente abre la simulación de su material en borrador
- **THEN** puede ensayarlo sin marcarlo preparado ni iniciar una sesión real

#### Scenario: Acceso no autorizado o material inválido
- **WHEN** un alumno o docente ajeno solicita la ruta, o falta material válido
- **THEN** no se entrega una simulación con ese contenido

### Requirement: Participantes ficticios y controles sincronizados
El ensayo MUST permitir ingreso con código de prueba, alternancia entre alumnos ficticios, respuestas independientes, desconexión y reconexión, navegación docente, apertura y cierre de actividades y finalización. MUST conservar una respuesta por alumno y actividad y mostrar resultados solamente en el panel docente.

#### Scenario: Dos alumnos responden
- **WHEN** dos participantes ingresan y responden una actividad abierta
- **THEN** el docente ve ambos resultados y cada alumno solamente su propia respuesta

#### Scenario: Actividad cerrada y reconexión
- **WHEN** cambia la pantalla o el docente cierra la actividad
- **THEN** se rechazan nuevos envíos; al reconectar un alumno conserva su respuesta y recibe la pantalla actual

### Requirement: Aislamiento y reinicio
El sistema MUST identificar claramente la simulación y MUST NOT guardar sesiones, respuestas o cuentas ficticias en los datos reales. El ensayo MUST permitir reinicio y explicar que se descarta al salir o recargar.

#### Scenario: Reinicio
- **WHEN** el docente reinicia el ensayo
- **THEN** vuelve a la primera pantalla con actividades cerradas, sin respuestas ni participantes ingresados y sin modificar el material o historial real
