# Sistema de diseño del campus Epixum

Esta dirección reemplaza «The Luminescent Curator» para el cambio `redesign-dark-learning-workspace`. El campus mantiene el tema oscuro y prioriza completar tareas, orientarse dentro de un curso y leer contenido educativo en computadora y celular.

## Color y superficies

El fondo es `#0c1014`. Las superficies progresan desde `#141a21` hasta `#2b3845`, con texto principal `#f2f4f7`, secundario `#b9c4d0` y atenuado `#a4b1c0`. El verde `#78e8ae` identifica acciones y selección; el azul `#9dbdff` acompaña información.

Usar nombres semánticos definidos en `app/globals.css`. Las tarjetas pueden tener bordes sutiles para separar contenido. Los campos usan `outline` con contraste verificable y el foco de teclado usa un contorno de 3 px. Las acciones primarias tienen fondo sólido. Los estados incluyen texto; el color por sí solo no expresa el resultado.

## Jerarquía y ritmo

Mantener Manrope en títulos e Inter en cuerpo. Los títulos de página se adaptan de 1.5 a 2.5 rem; los títulos de sección suelen usar 1.25 rem. Las descripciones apoyan la siguiente acción sin repetir el encabezado.

El contenedor `page-container` centraliza el margen adaptable de 1 a 2.75 rem. Las tarjetas usan radios de 1.25 rem y controles de 0.625 rem. El contenido de lectura tiene un ancho máximo de 75 caracteres aproximados. Reservar las cápsulas para etiquetas y estados.

## Navegación

En computadora, la barra lateral muestra secciones, espacios disponibles y perfil. La cabecera mantiene la ubicación y acceso al perfil. En celular, un botón abre el menú de navegación mediante el diálogo compartido, con manejo de foco y cierre con Escape.

El curso conserva sus pestañas. En cursos semanales, «Unidades» lleva al listado; en cursos tradicionales, «Clases» y «Trabajos» llevan a sus respectivas secciones. Las pestañas permiten desplazamiento horizontal local con una barra fina. Las migas de pan muestran la ruta completa en computadora y una versión breve en celular.

## Recorridos

- **Estudiantes:** próxima actividad antes de indicadores; unidades plegables con cantidades visibles; entregas con instrucciones breves y estado de revisión.
- **Docentes:** pendientes operativos; unidades con contenido y acciones de gestión; entregas con estudiante, versión, fecha y estado.
- **Administración:** estado del campus, accesos de gestión y cursos en preparación.
- **Ingreso:** marca, propósito y acceso con Google; nombre accesible durante la espera y errores visibles.
- **Formularios:** etiquetas explícitas, controles táctiles y selección múltiple con casillas. Evitar instrucciones dependientes de Ctrl/Cmd.
- **Recursos:** títulos legibles, acción de abrir o descargar y errores persistentes que permitan reintentar.

## Adaptación y accesibilidad

Los componentes deben caber en 320 px sin recortar el margen derecho, incluso con una barra de desplazamiento vertical clásica. Las filas se apilan y las tablas ofrecen tarjetas en celular. Los diálogos y las unidades nativas se operan con teclado.

Mantener controles de al menos 44 px de alto, foco visible, etiquetas comprensibles y respeto de `prefers-reduced-motion`. Ver [FOUNDATIONS.md](FOUNDATIONS.md) para los contrastes calculados y [DARK_REDESIGN_REVIEW.md](DARK_REDESIGN_REVIEW.md) para la auditoría de este cambio.
