# Onboarding de cursos de IA

## Recorrido del alumno

La opción administrativa **Habilitar onboarding de IA** agrega un enlace a las invitaciones pendientes y una tarjeta en el resumen estudiantil. Puede completarse antes o después de activar la matrícula.

1. Confirmación de apellido/s, nombre/s, DNI, nacimiento, teléfono y email. Los datos se precargan y se validan en el servidor. Nombres y apellidos se guardan con inicial mayúscula por palabra, preservando tildes. El email autenticado no se reemplaza: una corrección se registra como solicitud para administración.
2. Encuesta inicial de nueve preguntas sobre experiencia, frecuencia, herramientas, usos, estrategias, verificación, acceso pago, objetivos y un problema concreto opcional. Quien nunca usó IA omite las preguntas 3 a 6. El plan pago es opcional y no se solicitan importes. Se puede guardar un borrador; al enviarla se conserva como línea de base inmutable.
3. Preparación: computadora con Internet, herramienta de IA gratuita o paga y conocimientos previos. El curso incluye prácticas pero no enseña el uso desde cero. Requiere aceptar que se leyeron las indicaciones.

Cada etapa guarda su avance. El mensaje de preparación permanece en el resumen después de finalizar. Los principiantes reciben una advertencia, sin bloqueo de clases. Completar onboarding no activa ni reemplaza la matrícula.

## Seguimiento y privacidad

Administración: `/admin/courses/[id]/onboarding`.
Docentes asignados: `/docentes/cursos/[id]/onboarding`.

El informe muestra invitados/matriculados, etapas completadas, encuestas enviadas, distribución de experiencia y acceso pago, y respuestas individuales. Solo administración recibe solicitudes de cambio de email; deben validarse antes de modificar cuentas o invitaciones. No se envían correos automáticamente.

`course_onboarding` contiene avance, borrador y solicitud de email. `course_onboarding_surveys` contiene respuestas enviadas y versión. Ambas colecciones bloquean toda lectura y escritura directa desde PocketBase; los servicios servidor autorizan la identidad y el alcance antes de usar privilegios y no devuelven borradores al informe.

Los índices únicos por curso/alumno evitan duplicados. Un reenvío no modifica la primera encuesta. Las fechas de confirmación y aceptación son independientes. Un fallo al guardar perfil impide marcar la etapa como terminada.

## Migración

```powershell
npm.cmd run schema:onboarding:test
npm.cmd run schema:onboarding -- --enable-course=ID_DEL_CURSO
```

La migración respalda esquema, curso e inventario en `backups/pocketbase/`, preserva otros campos e índices, y habilita únicamente el curso indicado. Sin argumento no habilita cursos. La configuración se debe acompañar del despliegue de la aplicación.

Rollback: deshabilitar onboarding desde administración. Conservar colecciones y respuestas para no perder historia.

## Verificación

Pruebas unitarias y UI: validación de fechas/nombres, saltos y exclusiones, protección de identidad, permisos, secuencia, borradores, encuesta inmutable y aceptación. `scripts/onboarding-browser-fixture.mjs` crea un curso temporal, verifica persistencia y restricciones API, y lo limpia usando sus IDs exactos; no modifica alumnos reales.

```powershell
node scripts/onboarding-browser-fixture.mjs create
# Recorrer el flujo local con student-state.json; luego:
node scripts/onboarding-browser-fixture.mjs verify
node scripts/onboarding-browser-fixture.mjs enroll
# Revisar resumen y seguimiento con la sesión docente temporal.
node scripts/onboarding-browser-fixture.mjs cleanup
```

Las sesiones de prueba se guardan en una carpeta ignorada por Git y se eliminan al limpiar el fixture.

## Resultado de la implementación

Verificado el 5 de octubre de 2026: 49 pruebas seleccionadas de lógica/UI, 41 pruebas de esquema existente y la prueba específica de migración aprobadas; tipos, lint y build de producción correctos. Recorrido real en navegador con datos temporales: invitado, confirmación, encuesta condicional, borrador/reanudación, aceptación, resumen permanente, informe docente y rechazo de usuario ajeno. API directa bloqueada para alumno, docente y usuario ajeno.

Esquema aplicado con respaldo y habilitación únicamente del curso solicitado. Los registros y credenciales temporales se eliminaron. El código requiere despliegue de la aplicación para estar disponible en producción.
