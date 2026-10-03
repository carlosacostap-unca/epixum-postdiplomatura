## Context

Ver `proposal.md`. Existen tokens oscuros, primitivas UI y un shell compartido. Los cursos incorporaron organización por unidades después de la navegación inicial: los enlaces `#clases` y `#trabajos` quedaron sin destinos en ese modo. Varias rutas de compatibilidad y evaluación mantienen estilos zinc/azul, y las grillas con tracks fijos desbordan en anchos intermedios.

## Goals / Non-Goals

**Goals:** reducir carga visual y desplazamiento, unificar todas las rutas mediante tokens y contenedores comunes, mantener operación por teclado y preservar acciones existentes.

**Non-Goals:** modificar reglas de entrega, visibilidad, matrículas, permisos o resultados de IA; publicar en producción o migrar datos.

## Decisions

- Superficies carbón con matiz frío, texto marfil y verde moderado; radios de 10–20 px, títulos adaptativos y controles con contraste. Reemplaza el énfasis decorativo de radios enormes y gradientes intensos. Los límites discretos se admiten cuando ayudan a identificar controles.
- Shell con sidebar estable, selección tonal y cabecera de ubicación. El menú móvil reutiliza el diálogo accesible existente, sin una dependencia nueva. La barra inferior desaparece para recuperar espacio de lectura.
- Unificar enlaces del curso en un helper compartido que considera `organizationMode`; las páginas de detalle siguen usando las URLs actuales. En modo semanal Clases/Trabajos se representan mediante «Unidades» y las métricas apuntan al mismo listado.
- Usar unidades plegables basadas en `details/summary`: semántica nativa, teclado, contenido renderizado en servidor y sin serializar todos los datos a un cliente nuevo. Abrir por defecto la unidad de la próxima actividad y la primera como fallback; en docencia mantener acciones y contenido disponibles mediante expansión.
- Un contenedor de página aplica espaciado adaptable explícitamente a las rutas; migrar colores heredados a tokens en el código, evitando overrides globales de clases.
- Verificar interacciones con Vitest, tipos/lint/build y revisar representaciones visuales en varios anchos. No introducir cuentas, matrículas o evaluaciones de prueba en la instancia real.

## Risks / Trade-offs

- [Selección de pestaña por ancla] → representar el modo semanal con un único destino válido y probar ambos modos.
- [Contraste y largas cadenas en móvil] → comprobar tokens y reflow; tracks flexibles, saltos de línea y overflow interno en tablas.
- [Cambios de layout en formularios existentes] → mantener inputs, nombres, callbacks y acciones de servidor; ejecutar pruebas existentes.
- [Acceso a portadas requiere sesión] → usar fixtures locales para la revisión visual cuando no exista una sesión autorizada, documentando límites de la comprobación.

## Migration Plan

Cambios exclusivamente de código. Validar antes de desplegar. Para revertir, restaurar los archivos de este cambio sin tocar los cambios locales previos del usuario. No se modifica el esquema ni la información guardada.
