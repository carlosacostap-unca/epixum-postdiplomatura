## Context

Next.js 16 en un VPS propio y PocketBase con cuentas, matrícula contextual y materiales privados ya preparados. Se necesitan hasta aproximadamente 100 alumnos por encuentro, sin nuevas cuentas, notas ni publicación de respuestas entre pares.

## Goals / Non-Goals

Goals: conducción en vivo, ingreso por código, recuperación de conexión, consultas privadas e historial estable. Non-goals: videollamada, chat, edición visual del material, calificaciones, acceso anónimo o despliegue automático.

## Decisions

- Separar sesiones públicas para participantes de copias privadas del material. Guardar únicamente la pantalla actual saneada en la sesión; nunca enviar soluciones ni pantallas futuras al alumno. Mantener título de clase y copia al eliminar referencias originales.
- Crear sesión y copia mediante batch transaccional. Índices únicos para una sesión activa por material, código, participación y respuesta. Las escrituras ordinarias usan el token del usuario y reglas PocketBase; el cliente de servicio sólo resuelve un código antes de comprobar matrícula.
- Control exclusivo del docente iniciador, lectura para colegas asignados. Revisión aleatoria y comparación en regla de actualización para impedir comandos concurrentes obsoletos. Una respuesta es definitiva por actividad; los reintentos recuperan el registro existente. La regla de creación comprueba estado, pantalla y revisión de la sesión para impedir respuestas tardías.
- SSE desde Next.js con cookie HttpOnly y suscripciones PocketBase mediante EventSource del servidor. Canal de invalidación, lecturas autenticadas que recuperan el estado durable y refresco periódico de respaldo. Los streams se renuevan para revalidar permisos y liberar recursos. No se entrega el token al navegador ni se comparte un cliente autenticado entre usuarios.
- Latido de participación cada 15 segundos y presencia reciente de 45 segundos basada en fecha del servidor. Una participación por cuenta aunque abra varias pestañas. La presencia es orientativa, no asistencia certificada.
- Endpoints de escritura con verificación de origen y entradas acotadas; retorno del login restringido a rutas interactivas locales. Historial global docente incluye encuentros cuyo material fue eliminado.

## Risks / Trade-offs

El proxy del VPS debe desactivar buffering para SSE y permitir conexiones persistentes; el refresco de respaldo permite recuperarse de interrupciones. La prueba local de 100 cuentas mide el entorno utilizado y no garantiza la capacidad del VPS de producción. Las reglas de consulta contextual y expansión de usuarios deben verificarse contra PocketBase real. Se verificará comparación de revisión dentro de la base, no con bloqueos en memoria del proceso Next.

## Migration Plan

Migración aditiva e idempotente de cuatro colecciones y sus índices/reglas. No habilita cursos ni modifica preparación existente. Verificar acceso con fixtures temporales y limpiar en finally; conservar los datos reales. Ejecutar pruebas unitarias, integración de permisos y concurrencia, navegador y build. Documentar configuración VPS y comandos de instalación antes del despliegue manual.

## Open Questions

No hay decisiones funcionales pendientes. Ajustar tiempos de conexión sólo si las mediciones del entorno lo justifican.
