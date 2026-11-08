## Why

Algunos cursos necesitan una forma lúdica de recorrer sus actividades sin perder la continuidad con el aula. La cohorte 2 de Pensamiento Crítico será el piloto de un módulo optativo de mapa de misiones, elegido por el usuario, con una ambientación original de aldea tranquila.

## What Changes

- Contenido de clase integrado en la pizarra: lectura y materiales compatibles dentro del juego con autorización renovada en servidor.
- Sede única de clases: Nodo Tecnológico Catamarca en pixel art basado en fotografías del usuario, con acceso a todos los encuentros desde su entrada.
- Primera versión funcional: mapa navegable de clases y tablero de misiones asociado a trabajos publicados, con vista de lista accesible.
- Evolución autorizada: renderizado con Phaser, arte pixel art original generado por código y entorno animado; selección de edificios conectada al panel React.
- Aula inmersiva como entrada predeterminada del piloto: juego a ventana completa y menú ampliable con salida a cursos, aula clásica, encuentros, misiones, diario, ayuda y control de animaciones.
- Primer ingreso obligatorio con creación de personaje personalizable, confirmación de datos reales y recorrido guiado reanudable. Salida a `https://www.epixum.com`, destino confirmado por el usuario.
- Activación explícita por curso mediante un catálogo tipado del módulo; piloto en `5wdbs1o1p22vszm`, sin afectar la cohorte anterior.
- Estado de misiones derivado de entregas y evaluaciones publicadas existentes; sin duplicar calificaciones ni registrar clics como aprendizaje.
- Ruta estudiantil autorizada y acceso desde la navegación del curso, conservando la modalidad habitual.
- Ambientación original «Valle de las Ideas», con lugares, senderos y narrativa de investigación. El avatar camina con teclado y controles táctiles y entra al interior transitable del Nodo y recorre cada aula y accede a su contenido desde la pizarra. No incluye economía, inventario, multijugador ni nuevas evaluaciones.

## Capabilities

### New Capabilities
- `course-mission-map`: recorrido opcional de cursos mediante un mapa y misiones conectadas al aula.

### Modified Capabilities
Ninguna.

## Impact

Nuevo módulo `lib/course-game` con catálogo, proyección y adaptador servidor; interfaz aislada en `components/course-game`; ruta `/estudiantes/cursos/[id]/aventura` y enlace condicional en la navegación existente. Phaser se incorpora como dependencia cargada exclusivamente en cliente. Sin migraciones ni escrituras en PocketBase. Se reutiliza la sesión y se verifica matrícula vigente y publicación antes de exponer datos. La cohorte tiene ocho clases publicadas y cero trabajos al inspeccionarla el 8/11/2026: el estado vacío de misiones es parte del producto, sin inventar consignas ni trasladar trabajos de otra cohorte.
