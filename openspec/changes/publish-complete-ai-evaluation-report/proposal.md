## Why

Los alumnos reciben sólo el mensaje resumido aunque la preevaluación conserva observaciones por criterio, fortalezas, correcciones y cobertura. Publicar esas justificaciones permite entender el resultado y preparar correcciones sin confundir limitaciones del análisis con faltantes del trabajo.

## What Changes

- Preparar por defecto una devolución completa y editable al adoptar una nueva preevaluación.
- Incorporar observaciones por criterio, rúbrica disponible, fortalezas, correcciones, advertencias, commit y cobertura al texto publicado.
- Conservar devoluciones existentes y el historial sin migraciones ni republicaciones automáticas.
- Mantener revisión humana, controles de autorización y versión; no exponer colecciones privadas, secretos ni un supuesto registro del razonamiento interno.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ai-preevaluation`: preparación del informe completo como propuesta docente editable antes de publicar.

## Impact

Formateador compartido de devolución, DTO docente y formulario de adopción. El informe se guarda íntegramente en `deliveries.feedback`, que ya soporta texto largo y es visible al propietario tras publicar; el historial lo conserva sin cambios de esquema. No se abren permisos de `ai_preevaluations`, no se alteran resultados antiguos ni se envían correos. Las vistas estudiantiles existentes deben mostrar el texto completo, validado con pruebas de publicación e historial.
