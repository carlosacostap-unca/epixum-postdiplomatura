## Why

Los docentes necesitan registrar el resultado mientras conversan con el alumno. La aplicación oculta y rechaza la evaluación hasta el fin del turno, aunque este ya haya comenzado.

## What Changes

- Permitir evaluar desde el instante de inicio del turno y después de su finalización.
- Alinear pantalla, servicio y regla de actualización de reservas en PocketBase.
- Conservar autorización docente, resultado definitivo, historial y privacidad de notas.
- Migrar únicamente la condición temporal de la regla existente, con respaldo y sin modificar registros.

## Capabilities

### New Capabilities

- `review-evaluation-timing`: disponibilidad temporal de la evaluación de reservas pendientes, complementando las revisiones por turnos existentes.

### Modified Capabilities

Ninguna capacidad archivada. La capacidad de revisiones existente sigue documentada en el cambio activo `add-course-review-appointments`.

## Impact

Componentes de agenda docente, servicio de revisiones, reglas y migración incremental de PocketBase, documentación y pruebas. Sin nuevos campos, dependencias ni modificaciones de reservas o evaluaciones existentes. La nueva regla es compatible con la aplicación anterior, que seguirá esperando hasta finalizar el turno mientras no se despliegue el código nuevo.
