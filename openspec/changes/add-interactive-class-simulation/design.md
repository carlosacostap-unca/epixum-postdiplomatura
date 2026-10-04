## Context

LiveRoom combina transporte SSE/HTTP y presentación. La preparación usa permisos de curso y valida JSON. Ver motivación en proposal.md.

## Goals / Non-Goals

**Goals:** compartir controles y formularios con la sala real, aislar resultados y ofrecer ensayo sin cuentas adicionales.

**Non-Goals:** probar carga/red del VPS, acceso desde otros dispositivos o persistencia del ensayo.

## Decisions

- Extraer LiveRoomView sin transporte; LiveRoom conserva HTTP/SSE. La simulación entrega estado y comandos locales al mismo componente. Evita cambios en contratos y reglas de producción frente a agregar sesiones de prueba persistidas.
- Estado en memoria de una página docente protegida. Panel docente y alumno seleccionado, hasta 100 identidades ficticias, ingreso mediante código fijo de prueba y reconexión explícita. Sin almacenamiento del material en localStorage ni mensajes entre ventanas.
- Motor puro usa publicScreen y validateLiveAnswer existentes, revisiones y reglas de apertura/cierre. Reinicio confirma descarte. Las identidades y respuestas se descartan al desmontar.
- La ruta carga material mediante los mismos permisos de preparación; no requiere clase asociada ni estado ready.

## Risks / Trade-offs

- Divergencia de simulación y servidor → reutilizar validación y presentación, probar transiciones y rechazos.
- Confundir ensayo con sesión real → rótulos permanentes y código solo local, sin enlace público ni historial persistente.
- Cambios en presentación compartida → pruebas de transporte real y compilación además de flujo simulado.

## Migration Plan

Desplegar aplicación mediante build habitual, sin migración. Reversión de código suficiente; datos reales intactos.
