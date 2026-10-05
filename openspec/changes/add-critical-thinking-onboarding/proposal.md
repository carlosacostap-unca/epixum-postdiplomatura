## Why

Los alumnos necesitan confirmar sus datos importados y conocer los requisitos para practicar durante las clases. El equipo docente necesita una encuesta inicial de experiencia y acceso a herramientas de IA.

## What Changes

- Onboarding de tres etapas con progreso persistido: datos personales, encuesta aprobada de nueve preguntas y aceptación de preparación para las clases.
- Acceso para invitados pendientes y matriculados, sin activar matrículas ni bloquear el contenido por falta de experiencia.
- Mensaje permanente de preparación en el resumen del curso y aviso para principiantes.
- Consulta de progreso y respuestas para administración y docentes asignados.
- Habilitación inicialmente solo en Pensamiento Crítico y Resolución de Problemas en Entornos de Inteligencia Artificial.

## Capabilities

### New Capabilities
- `course-onboarding`: verificación personal, encuesta inicial, requisitos y seguimiento por curso.

### Modified Capabilities
Ninguna.

## Impact

Nueva colección privada de PocketBase, indicador optativo en courses, migración idempotente con respaldo, acciones servidor, páginas y componentes. Se conservan usuarios, invitaciones, matrículas y autenticación Google. Los cambios de email se registran como solicitudes para administración, sin reemplazar la identidad autenticada. Sin nuevas dependencias.
