## Context

Ver proposal.md para la motivación. El detalle existente valida curso y trabajo, dispone de evaluación manual/IA y descarga privada. El listado tiene filtros locales y corrección en acordeón. Se conserva esa compatibilidad.

## Goals / Non-Goals

**Goals:** navegación coherente entre el listado y el detalle, evaluación visible junto a la entrega y protección de edición local.

**Non-Goals:** cambiar el modelo de evaluación, permisos, persistencia, proveedor de IA o incorporar un visor universal de documentos.

## Decisions

- Reutilizar la ruta de detalle y las acciones de evaluación: evita mantener otra implementación con reglas divergentes.
- Compartir normalización de filtros y búsqueda entre servidor y cliente; transportar solamente parámetros conocidos en la URL. Se descarta un destino de retorno arbitrario para mantener la navegación dentro del contexto autorizado.
- La cola contiene entregas del mismo trabajo; al guardar conserva la entrega actual como referencia aunque cambie su estado. El servidor valida autorización antes de cargar la cola.
- Componer el material del servidor como contenido del cliente de evaluación. En escritorio el formulario queda a la derecha y sus acciones permanecen visibles al recorrerlo. Los archivos se descargan con la autorización existente; no se incrustan URLs arbitrarias.
- Un contexto de edición coordina la advertencia en anterior/siguiente/volver y beforeunload. Cada estudiante/versión usa una clave propia para evitar trasladar el estado del editor.
- Mantener estado de publicación y valores guardados en el cliente sólo después de confirmar éxito del servidor; deshabilitar acciones concurrentes y conservar el texto ante fallos.

## Risks / Trade-offs

- [Navegar perdiendo trabajo] → confirmación en controles del espacio de corrección y advertencia nativa al cerrar/recargar.
- [Filtros eliminan la entrega recién publicada] → incluir la actual al calcular posición y vecinas.
- [Documentos externos o ZIP sin vista previa] → identificar archivos y ofrecer descarga individual/ZIP o abrir enlace; no prometer un visor que no existe.
- [Regresión de IA/versionado] → conservar el contrato de la acción y ejecutar las pruebas existentes más casos de navegación y guardado.

## Migration Plan

Despliegue de la aplicación sin migraciones. Reversión por los archivos de interfaz; no modifica registros existentes.

## References

- https://www.saasui.design/pattern/dashboard/linear
- https://community.instructure.com/en/kb/articles/662775-what-is-speedgrader
- https://developers.google.com/workspace/classroom/add-ons/get-started/iframes/grader-iframe
