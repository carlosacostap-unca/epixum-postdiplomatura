## Why

Los materiales interactivos ya pueden prepararse y asociarse a clases. Falta conducir encuentros reales con alumnos identificados, sincronizar pantallas y recoger respuestas sin mezclar sesiones ni generar calificaciones.

## What Changes

- Abrir y finalizar sesiones desde un material preparado, con enlace y código de ingreso, conservando una copia del material utilizado.
- Ingreso con la cuenta actual y matrícula vigente; retorno al enlace después del login.
- Panel docente con control de pantalla, apertura/cierre de actividades, participantes conectados y resultados privados.
- Vista del alumno sincronizada y recuperable tras reconexión, con opción múltiple, encuestas y texto breve; una respuesta por actividad y sesión.
- Historial de sesiones, participantes y respuestas para consulta docente, sin notas.
- Prueba de 100 conexiones y respuestas concurrentes, con resultados medidos en el entorno disponible.

## Capabilities

### New Capabilities

- `live-interactive-sessions`: ciclo de sesión, acceso, sincronización, presencia y respuestas.

### Modified Capabilities

- `authentication-and-access`: retorno seguro a una sesión interactiva tras autenticarse.

## Impact

- Nuevas colecciones PocketBase para sesiones, copias privadas del material, participantes y respuestas; reglas de permisos, índices únicos y migración aditiva.
- Nuevas páginas docentes/estudiantiles, endpoints autenticados y canal SSE sobre la sesión HttpOnly actual.
- Dependencia `eventsource` para la suscripción PocketBase del servidor Next.js. No se envían tokens de autenticación al navegador.
- Conservación de datos de preparación y de las funciones existentes. La edición o eliminación del material original no altera el historial de encuentros.
- No se despliega la aplicación automáticamente ni se incorporan calificaciones, chat, video o invitados anónimos.
