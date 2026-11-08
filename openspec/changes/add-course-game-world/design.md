## Context

Ver proposal.md. El monolito organiza dominios en `lib`, componentes y rutas de App Router. La navegación estudiantil tiene cambios locales previos que deben preservarse. PocketBase aplica reglas por curso; la capa del mapa vuelve a verificar sesión, matrícula, docencia, publicación y pertenencia. La cohorte piloto está en curso y tiene ocho clases con títulos genéricos y sin descripción.

## Goals / Non-Goals

**Goals:** aislar catálogo, proyección pura y acceso servidor; producir DTO mínimos sin datos de otros estudiantes ni devoluciones privadas; ofrecer una experiencia visual sin otro servicio desplegable.

**Non-Goals:** guardar progreso de lectura, crear contenidos académicos, clonar assets de Stardew Valley, agregar reglas de evaluación, cambiar permisos existentes o configurar cursos desde un editor docente en esta iteración.

## Decisions

- Catálogo tipado con IDs de curso y nombres originales de lugares. Alternativa: campo nuevo en PocketBase y editor; se difiere para no introducir una migración en el piloto. Otros cursos se habilitan agregando configuración explícita; nunca por coincidencia de título.
- Adaptador con cliente autenticado sin superusuario. Consulta el curso y matrícula antes del contenido. Solo el estudiante matriculado que no es docente del curso accede; los permisos por curso permiten usuarios con roles globales distintos que estudian este curso.
- La proyección consume clases, trabajos y entregas del usuario actual, filtra publicación efectiva y produce enlaces internos. El piloto es tradicional; una configuración de curso semanal requiere adaptar primero la visibilidad de semanas y no se habilita en esta versión.
- Misiones de trabajos reutilizan `getStudentDeliveryState`. La reconstrucción en cada visita evita sincronizaciones, duplicados de recompensas y escrituras. La restauración visual deriva del número de trabajos aprobados; abrir una clase nunca equivale a completarla. No hay XP ni notas nuevas.
- Phaser cargado por importación dinámica dentro de un efecto cliente. Escena a resolución lógica baja, sin suavizado, con arte original construido mediante píxeles rectangulares. React conserva botones semánticos superpuestos, detalle y lista. Las posiciones compartidas sincronizan edificios y controles. Se destruye el motor al desmontar, incluso ante importación tardía o montaje doble de desarrollo. No hay bus global ni consultas de datos desde Phaser.
- Agua, humo, vegetación y detalles ambientales animados; pausa manual y respeto de movimiento reducido. La escena comunica disponibilidad o fallo al contenedor. Si falla la carga, los controles HTML y la vista de lista siguen operativos. El cambio de selección actualiza el resaltado sin recrear el motor.
- Sede única: Nodo Tecnológico Catamarca. Arte original de rectángulos Phaser basado en las cinco fotos aportadas: portal claro, dos alas vidriadas azules, pasarela central, escalinata, jardines, bancos, palmeras y bandera argentina animada. Un control HTML sobre el edificio abre la lista completa sin truncar a ocho; cada clase conserva título y destino. En móvil se reduce la escala del mapa y se centra la sede al montar.

## Risks / Trade-offs

- [Sin trabajos publicados, no hay progreso medible] → explicar el estado vacío y ofrecer clases reales; no inventar consignas.
- [Catálogo requiere código para habilitar cursos] → documentar la extensión y rollback; editor docente en una evolución separada.
- [Consulta fallida aparenta falta de avance] → propagar fallos y usar límite de error recuperable; no usar helpers que silencian errores de entrega.
- [Mapa es presentación lúdica inicial] → identificarlo como primera versión; narrativa interactiva, decisiones y recompensas persistidas se diseñan después con consignas reales.

## Migration Plan

### Personaje y bienvenida inicial

Nueva colección privada `course_game_onboarding`, índice único por curso/estudiante. Guarda apariencia validada, email de contacto, confirmación del perfil; no duplica DNI ni fecha de nacimiento. El recorrido se guarda como pasos append-only en course_game_tour_steps, con índice único por bienvenida/versión/paso. Su finalización se deriva de los pasos contiguos, evitando regresiones por concurrencia. Los datos personales existentes se actualizan en `users`. El email de contacto no cambia credenciales. Guardado de perfil y personaje mediante batch atómico, tras verificar sesión, matrícula, habilitación y ausencia de docencia en ese curso. El servidor toma la identidad de sesión; no acepta IDs de otro alumno.

El primer ingreso presenta editor de personaje, confirmación de datos y recorrido sobre el mapa real. Apariencia y perfil deben guardarse antes del recorrido. El servidor permite avanzar de a un paso y trata reintentos anteriores como operaciones idempotentes. La finalización deriva del último paso; el acceso al mapa de juego requiere esa finalización. Datos personales permanecen en formulario/servidor; Phaser solo recibe apariencia. No se guardan DNI, fecha, correo ni teléfono en localStorage o logs. Vista previa con adaptador en memoria y campos vacíos; no escribe PocketBase. Migración preparada y probada localmente, sin aplicar ni desplegar en esta entrega.

La salida del juego y del onboarding es `https://www.epixum.com`, confirmada explícitamente. Las rutas internas del aula clásica se conservan como opción distinta. El personaje usa un esquema de piezas pixel art original compartido por el editor y Phaser.

### Aula inmersiva

La aventura ocupa `100dvh` y todo el ancho, sin el shell habitual. AppShell omite su envoltorio solo para la ruta exacta de aventura; la autorización continúa en servidor. La portada del curso habilitado redirige a la aventura después de comprobar matrícula, salvo `?vista=clasica`. El menú ofrece salida a `https://www.epixum.com` sin cerrar sesión. La escena conserva proporción y permite desplazamiento cuando excede la ventana, con controles fijos y acceso alternativo mediante encuentros. Un diálogo nativo contiene menú y paneles, pausa el entorno mientras está abierto y restaura el foco al cerrar. Acciones definidas como una lista ampliable.

No hay migración ni modificación de datos. Desplegar código después de pruebas. Eliminar la entrada del catálogo deshabilita tanto navegación como ruta sin perder progreso académico. No hacer push ni despliegue como parte de esta implementación local.

### Movimiento del personaje

Posición efímera en la escena Phaser, capa gráfica separada y animación simple de pasos conservando la apariencia elegida. Velocidad de 60 píxeles lógicos por segundo, diagonal normalizada, delta limitado y subpasos para evitar atravesar obstáculos. Colisión por pies con fachada, límites, río (excepto puente), bancos y jardines. El control se recibe mediante getter estable: React gestiona teclado y captura de puntero sin listeners globales de teclas. Blur, visibilidad y paneles limpian entradas; tutorial/panel bloquean movimiento independientemente de la pausa ambiental. Cámara desplaza el contenedor cuando el personaje alcanza los márgenes.

Cruzar el umbral abre el panel existente de clases y reposiciona al personaje fuera del umbral; E funciona cerca de la entrada. El botón del edificio y Encuentros conservan acceso alternativo. La evolución siguiente incorpora un interior transitable; las coordenadas siguen siendo efímeras. Se conserva el onboarding obligatorio de producción.

### Interior y aulas

Escena interior original, sin afirmar que reproduce la planta del Nodo real. Ocho aulas por ala, dibujadas con ventanas, pizarras, escritorios y pasillo central. roomDoor, canStandInside, enteredRoom y atExit comparten las posiciones de dibujo, botones y colisiones. La entrada cambia de escena, los umbrales de aulas abren una presentación individual con el enlace real y cerrar devuelve al pasillo. La salida sur y el botón Salir al jardín devuelven al exterior. Cada transición limpia input y crea una escena nueva, destruyendo la anterior mediante el ciclo existente. Más de ocho clases se muestran en alas accesibles por controles; la lista ofrece todas sin truncar. No se consulta ni modifica progreso desde Phaser.

### Aulas transitables

Una escena ampliada por aula comparte un diseño original de seis escritorios con sillas, mesa docente, ventanas, pizarra y puerta sur. DESKS define geometría de arte y colisiones; el pasillo central permite alcanzar la pizarra desde el punto inicial. La transición conserva el índice real de clase y separa estar dentro del aula del panel de contenido. nearBoard controla botón y E; cerrar el panel no recrea la escena ni cambia posición. Volver al pasillo por puerta o botón limpia controles y crea nuevamente la escena interior. La lista alternativa mantiene acceso sin exigir destreza motriz. Sin escrituras de datos ni coordenadas persistidas.

### Lectura de clase integrada

LoadBoard es una función inyectable ligada al curso en la ruta servidor. La acción consulta mediante el cliente autenticado, revalida acceso al piloto, matrícula, pertenencia y publicación de la clase y filtra recursos por clase, padre exclusivo, publicación y audiencia. Los archivos reutilizan getResourceDownloadUrl para autorización y firma; no se expone un cliente privilegiado. Los DTO solo incluyen texto y recursos necesarios. Se carga al abrir y se descartan resultados tras desmontar o cambiar de clase.

La pizarra conserva el modal accesible y amplía el área de lectura. BoardHtml reconstruye etiquetas de formato como elementos React, sin HTML crudo, scripts, estilos arbitrarios o eventos. URLs solo http/https. Materiales: video/audio/imagen nativos, PDF y proveedores conocidos en iframe; scripts+same-origin solo para hosts canónicos YouTube/Google, nunca recursos arbitrarios. Sitios no compatibles o con restricciones de incrustación ofrecen un enlace externo explícito. No se promete que todos los proveedores acepten incrustación. Encuentros también abre la pizarra, mientras el aula clásica continúa como elección del menú.
