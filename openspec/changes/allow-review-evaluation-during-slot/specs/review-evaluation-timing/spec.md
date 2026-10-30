## Purpose

Permitir que los docentes registren el resultado de una revisión durante el encuentro, preservando los permisos, la privacidad y la coherencia del historial.

## ADDED Requirements

### Requirement: Evaluación desde el inicio del turno

El sistema MUST permitir a los docentes asignados al curso registrar asistencia, resultado, devolución y notas privadas de una reserva pendiente desde el instante de inicio de su turno, durante este y después de su finalización. El sistema MUST NOT permitir evaluar antes del inicio. La interfaz y la persistencia MUST aplicar el mismo límite temporal.

#### Scenario: Turno en curso
- **WHEN** un docente asignado evalúa una reserva pendiente cuyo turno ya comenzó y aún no finalizó
- **THEN** puede guardar el resultado y las notas privadas en una misma operación, y el alumno solo ve su resultado y devolución.

#### Scenario: Límite de inicio
- **WHEN** llega el instante exacto de inicio de un turno reservado
- **THEN** aparece la opción de evaluar y se permite guardar sin esperar al final.

#### Scenario: Turno futuro
- **WHEN** se intenta evaluar antes del inicio
- **THEN** la pantalla informa cuándo se habilita y la persistencia rechaza la evaluación sin modificar el historial.

#### Scenario: Turno finalizado
- **WHEN** una reserva pendiente corresponde a un turno que ya terminó
- **THEN** se conserva la posibilidad de evaluarlo.

### Requirement: Conservación de permisos y resultado definitivo

El sistema MUST conservar la autorización exclusiva de docentes asignados, la devolución pública solo para el alumno correspondiente, las notas privadas docentes y el carácter definitivo de una evaluación guardada. El sistema MUST NOT permitir evaluar reservas canceladas o ya evaluadas.

#### Scenario: Reserva ya evaluada o cancelada
- **WHEN** se intenta evaluar una reserva que dejó de estar pendiente
- **THEN** no se permite sobrescribir el resultado ni las notas privadas.

#### Scenario: Usuario sin autorización
- **WHEN** un alumno o un docente ajeno al curso intenta registrar un resultado durante el turno
- **THEN** la operación es rechazada sin crear evaluaciones o notas.
