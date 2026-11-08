# Mapa de misiones: Valle de las Ideas

Primera versión local del módulo optativo de aprendizaje lúdico. Piloto: Pensamiento Crítico y Resolución de Problemas en Entornos de Inteligencia Artificial (Cohorte 2), curso `5wdbs1o1p22vszm`.

## Acceso y alcance

El estudiante entra automáticamente a la aventura desde la portada del curso piloto, después de verificar sesión y matrícula. También puede usar **Aventura** o `/estudiantes/cursos/5wdbs1o1p22vszm/aventura`. No se admite al docente asignado al mismo curso. La vista habitual queda disponible desde el menú mediante **Abrir aula clásica**, con `?vista=clasica` para evitar volver a redirigir al juego.

El mapa tiene lugares seleccionables, acceso a las clases, vista alternativa de lista, diario y tablón de misiones con filtros. La ambientación pixel art es original y se renderiza con Phaser 4.0.0; no utiliza imágenes ni personajes de Stardew Valley. Es una primera capa lúdica sobre la cursada: no incluye todavía decisiones narrativas, avatar, inventario, recompensas persistidas ni editor docente de campañas.

La inspección del 8 de noviembre de 2026 encontró ocho clases publicadas y ningún trabajo en esta cohorte. Los títulos de lugares son ambientales, no una asignación de temas curriculares. No se copiaron consignas de la cohorte anterior ni se inventaron trabajos. Los trabajos publicados del curso aparecen automáticamente como misiones. Las clases publicadas pueden abrirse aunque su encuentro sea futuro; la fecha de clase no se confunde con la fecha de publicación.

## Progreso

PocketBase y el flujo de entregas existente son la fuente de verdad. El mapa diferencia pendiente, entrega registrada, reenvío, corrección, desaprobación y aprobación. Solo una evaluación publicada de la versión actual aporta una misión completada. El jardín crece con las aprobaciones; no hay nuevas notas ni escrituras. Abrir clases no registra asistencia, lectura ni finalización. El avance se reconstruye al entrar al mapa; no hay suscripción en tiempo real.

## Límites del módulo

- `lib/course-game/catalog.ts`: habilitación por ID, título, introducción y nombres de lugares.
- `lib/course-game/model.ts`: proyección pura de datos y DTO mínimos.
- `lib/course-game/service.ts`: cliente autenticado, matrícula y lecturas acotadas, sin superusuario.
- `components/course-game`: interfaz React y estilos aislados.
- `components/course-game/phaser/village-engine.ts`: aldea pixel art original a 480 × 320, con río, humo, mariposas, vegetación y un pato animados. El huerto responde al progreso aprobado.
- `components/course-game/PhaserVillage.tsx`: carga diferida en cliente, sincronización de selección/pausa y liberación del motor al desmontar. Botones HTML superpuestos mantienen navegación por teclado; Phaser no consulta datos ni decide aprobaciones.
- `lib/course-game/village-layout.ts`: posiciones compartidas del paisaje y los controles accesibles.
- `app/estudiantes/cursos/[id]/aventura`: ruta y límite de errores recuperable (`retry`, conforme a Next.js instalado).

Para habilitar otro curso tradicional se agrega una entrada explícita al catálogo. Para deshabilitarlo se elimina esa entrada: desaparece la navegación y la ruta deja de responder con contenido. El mapa original no requería migración; la bienvenida descrita al final incorpora dos colecciones privadas. Deshabilitar el catálogo conserva esos registros. Los cursos semanales quedan deshabilitados hasta incorporar al adaptador la visibilidad de las semanas.

## Validación del 8/11/2026

- 28 pruebas aprobadas entre el módulo, su interfaz y `StudentViews.test.tsx`.
- Cobertura de autenticación, matrícula, docencia contextual, curso deshabilitado, fallos de lectura, aislamiento entre estudiantes, publicación efectiva, evaluaciones privadas, versión de entrega y navegación por teclado.
- ESLint de todos los archivos nuevos y navegación: aprobado.
- OpenSpec `add-course-game-world`, validación estricta: aprobado.
- TypeScript global: cuatro errores TS5097 preexistentes en archivos `.mts` bajo `tmp/preparation/software-unit-6/revision-20261105/code/`. TypeScript de la aplicación excluyendo directorios temporales/salidas: aprobado, sin modificar la configuración principal.
- Vista aislada del componente con datos sintéticos: verificada en navegador a tamaño de escritorio y 390 × 844, selección de lugares y cambio a lista. Se corrigió superposición vertical en móvil. Esta vista no valida la sesión real ni los destinos de clases de producción.

No se ejecutó una prueba integral con sesión estudiantil real ni se desplegó el cambio. No se modificaron datos de PocketBase. Los cambios previos de estudiantes y docentes se conservaron; la única integración editada es el enlace condicional en `lib/course-navigation.ts`.

## Evolución Phaser y vista previa local

El usuario autorizó Phaser, pixel art y entorno animado el 8/11/2026. La dependencia queda fijada a 4.0.0. El motor solo se importa desde un efecto cliente; no se ejecuta durante SSR. No se agregan servicios, permisos ni migraciones. El control de animaciones permite pausar/reanudar y toma la preferencia `prefers-reduced-motion` al iniciar. La lista y los botones de encuentros siguen disponibles si la carga gráfica falla.

Validación adicional: 32 pruebas aprobadas (incluyendo montaje doble de StrictMode, importación tardía tras desmontaje, error del motor y sincronización sin recreación), lint y TypeScript de aplicación aprobados. Navegador: selección de edificios, pausa, mapa/lista, cero lienzos al salir y uno al regresar, escritorio y móvil de 390 × 844 sin desbordamiento horizontal. Vista previa compilada con Vite: motor en chunk separado de 1.36 MB, unos 354 kB gzip; queda la advertencia informativa de tamaño de chunk. No es una compilación integral de Next.js ni una prueba de sesión real.

Vista local: `http://127.0.0.1:5188/`. El servidor de muestra usa `tmp/course-game-preview/vite.config.mts` y se inicia con `node_modules/.bin/vite --config tmp/course-game-preview/vite.config.mts`. Presenta datos de muestra señalizados y enlaces de clases sin navegación al aula real. El contenido real continúa siendo leído por la ruta estudiantil protegida.

## Aula a ventana completa y menú

La aventura ocupa toda la ventana (`100dvh`), sin cabecera ni navegación lateral del campus. No necesita permisos de pantalla completa del sistema. El paisaje mantiene proporciones y se puede desplazar en ventanas pequeñas. Los controles de menú y las herramientas permanecen fijos; el detalle del edificio aparece sobre el mapa al seleccionarlo.

El menú contiene Encuentros (lista accesible), Misiones, Mi diario, Cómo jugar, control de animaciones y Abrir aula clásica. **Volver a Epixum** permanece fijo en su pie incluso cuando las opciones requieren desplazamiento y navega a `https://www.epixum.com`. Nuevas secciones se agregan a `menuSections` y `panelTitles` en `CourseMissionMap.tsx`. `GamePanel.tsx` utiliza diálogo nativo para contener el foco, cerrar con Escape y devolverlo al disparador. El entorno se pausa mientras un panel está abierto y recupera la preferencia anterior al cerrar.

`AppShell` omite su envoltorio únicamente para la ruta exacta de aventura. Las demás rutas conservan el campus; el cambio no altera autorización. La navegación de la vista clásica conserva `?vista=clasica` en sus enlaces al resumen y anclas. El estado de error de la aventura también ofrece salida a Epixum.

Validación de esta evolución: 49 pruebas aprobadas entre módulo, portada estudiantil, shell e interfaz; TypeScript de aplicación (excluyendo temporales ajenos) aprobado. Revisión visual de ventana completa y menú en escritorio y móvil, salida y regreso en la vista de muestra, y Escape con recuperación de foco comprobados. La vista previa simula las pantallas de salida y aula clásica, sin una sesión real ni acceso a información estudiantil.

## Bienvenida, personaje y perfil

La entrada ahora pasa por tres etapas: editor de personaje, confirmación de datos y recorrido de cinco pasos sobre el valle. El personaje ofrece hombre/mujer, cuatro tonos de piel, tres peinados, cuatro colores de pelo, tres colores de ojos, camisa/jardinero, cinco colores de ropa, tres pantalones y accesorios. El mismo dibujo original de 24×36 píxeles se usa en el editor y en Phaser.

Se precargan los datos disponibles del perfil y se solicitan nombre, apellido, DNI, fecha de nacimiento, teléfono y email de contacto. El email de contacto no cambia el de autenticación. No se acepta una fecha futura ni un DNI/teléfono inválido. El formulario conserva valores ante errores, permite volver al personaje y exige confirmación. Phaser recibe solo apariencia, nunca información personal.

Persistencia: la acción servidor valida sesión, curso habilitado, matrícula y ausencia de docencia contextual antes de abrir el cliente de servicio. Perfil en users y personaje/contacto en course_game_onboarding se guardan en un batch atómico. Colecciones privadas sin permisos API para clientes. Índice único por curso/alumno y pasos append-only en course_game_tour_steps con índice único por bienvenida/versión/paso evitan duplicados y regresiones ante reintentos concurrentes. El recorrido se retoma desde los pasos contiguos guardados; no admite adelantar pasos. La finalización libera el mapa y devuelve el foco al menú. No equivale a progreso académico.

La salida desde bienvenida, recorrido, menú y error apunta a https://www.epixum.com. Se mantiene el acceso explícito al aula clásica. La primera versión no permite reeditar el personaje ya confirmado.

Despliegue pendiente: ejecutar npm run schema:course-game contra el entorno elegido antes de publicar el código. El script comprueba batch y campos de perfil, respalda el esquema y crea las dos colecciones. Se probaron idempotencia, reglas privadas e índices con fixtures locales. No se aplicó esta migración ni se escribieron datos reales; no se probó una sesión estudiantil integral contra PocketBase.

La demostración local usa el mismo flujo con adaptador en memoria. No transmite ni persiste el perfil, no usa localStorage y reinicia al recargar. Para probar usar datos ficticios. Pruebas adicionales cubren autorización antes del cliente privilegiado, batch único, validación, guardado fallido, reenvíos, orden y reanudación del recorrido, mantenimiento del formulario y navegación del tutorial. Compilación Vite y TypeScript de aplicación aprobados; sigue la advertencia de tamaño del chunk Phaser.
Validación final de bienvenida: 63 pruebas de aplicación y 2 de esquema aprobadas; ESLint, TypeScript de aplicación y OpenSpec estricto aprobados. Recorrido completo con datos sintéticos comprobado en navegador, incluyendo personaje personalizado en Phaser. Disposición de escritorio sin desbordamiento horizontal y vista estrecha revisadas. Captura local: outputs/course-game/onboarding.jpg. La demostración queda abierta al inicio.

## Sede Nodo Tecnológico Catamarca

Las clases se reúnen ahora en un solo edificio inspirado en las cinco fotografías aportadas por el usuario. El pixel art se dibuja con geometría nativa en components/course-game/phaser/nodo-art.ts: fachada de dos alas azules, marco claro horizontal, pasarela y acceso central, escalinata, bancos, palmeras y bandera argentina. Se conservan río, vegetación y mariposas; se reemplaza el humo de las casas por movimiento de bandera y reflejos del vidrio. No se cargan fotografías ni assets externos en el cliente.

Seleccionar el edificio abre Clases en el Nodo con todos los encuentros publicados, sus fechas, títulos y enlaces; no se limita a ocho clases. El botón Encuentros ofrece el mismo acceso. El onboarding y la ayuda explican la nueva sede. El ajuste móvil permite ver el edificio completo y centra la entrada. La escena directa de demostración está en http://127.0.0.1:5188/?escena=nodo (solo el adaptador local permite omitir la bienvenida; la ruta de aplicación sigue exigiéndola).

Verificación: 39 pruebas de módulo/interfaz aprobadas, incluidos acceso al Nodo por teclado, retorno de foco y lista de diez clases sin truncar. TypeScript y ESLint aprobados. Navegador local: edificio completo en vista estrecha, ocho clases de muestra, Escape y retorno de foco verificados. Captura outputs/course-game/nodo-catamarca.jpg. Sin despliegue ni cambios en datos reales.

## Personaje caminante

Flechas y WASD con el mapa enfocado; en táctil mantener pulsados los cuatro controles. Pasos animados, colisiones con fachada/río/bancos/jardines, puente transitable y seguimiento del personaje al alcanzar los márgenes. La pausa ambiental no bloquea caminar; paneles, tutorial, pérdida de foco y cambio de pestaña sí detienen controles. Al cruzar el acceso central se abre Clases en el Nodo; E ofrece la misma acción al estar cerca. Cerrar regresa al exterior sin reabrir automáticamente. El acceso directo por Encuentros y edificio sigue disponible. La posición se reinicia al recargar; aún no se incluye un interior transitable.

Validación: 45 pruebas aprobadas en módulo e interfaz, TypeScript de aplicación y ESLint aprobados. Se verificaron diagonales, límites de delta, colisiones, puente, liberación de teclas, bloqueo por panel/tutorial, proximidad requerida para E y acceso al panel. En navegador se probaron pulsación sostenida del control, flecha arriba, E y Escape. Compilación Vite aprobada, con advertencia de tamaño Phaser preexistente. Vista directa local: http://127.0.0.1:5188/?escena=nodo. No se desplegó ni se modificó PocketBase.

## Interior transitable y aulas

Entrar al Nodo ahora lleva al pasillo interior. Se camina con los mismos controles. Cruzar la puerta de un aula o presionar E cerca de ella abre la presentación de su clase con el enlace real; cerrar devuelve al pasillo. Las ocho aulas del piloto tienen escritorios, pizarras y ventanas. Es una distribución imaginada para el juego, no una reconstrucción de la planta real. El acceso al contenido académico sigue usando la ruta estudiantil existente.

El recorrido de salida sur devuelve al jardín; también existe un botón accesible. Si hay más de ocho encuentros se agregan alas, conservando el acceso a todos los títulos/enlaces y la lista alternativa. Las puertas de aulas sin clase permanecen cerradas. Transiciones reinician posición y limpian controles; paneles bloquean movimiento. No hay cambios de base de datos.

Validación: 55 pruebas de módulo/interfaz aprobadas, incluidas las ocho puertas, paredes, aulas sin publicar, salida, acceso individual, regreso al pasillo y segunda ala con clase 10. TypeScript y ESLint aprobados. Navegador: recorrido exterior-interior-aula 2, retorno y salida caminando comprobados; captura outputs/course-game/nodo-interior.jpg. Vista local abierta en el interior, sin despliegue.

## Caminar dentro del aula y acceder por la pizarra

Cada puerta abre ahora una escena transitable de aula, sin mostrar directamente el contenido. Hay seis escritorios con sillas, mesa docente, ventanas, pizarra y salida sur al pasillo. Se camina con los controles existentes; escritorios y sillas bloquean el paso. El pasillo central permite llegar a la pizarra. Al estar cerca se habilita Ver pizarra y E, que abren el contenido de la clase vinculada. Cerrar el panel conserva la posición dentro del aula. Salir por la puerta o Volver al pasillo regresa al interior del Nodo. La lista alternativa continúa disponible.

Verificación: 63 pruebas aprobadas de módulo/interfaz, TypeScript y ESLint aprobados. Cobertura de los seis muebles, pasillo hasta pizarra, salida, proximidad, bloqueo del contenido distante, contenido correcto, regreso al aula/pasillo y alas adicionales. Navegador: aula 2, recorrido hasta pizarra e interacción E comprobados. Vista previa local, sin despliegue ni modificaciones en PocketBase.

## Lectura dentro de la pizarra

La pizarra ahora carga la descripción real de la clase y sus materiales publicados, sin redirigir al aula clásica. Encuentros usa el mismo lector. Incluye pestañas, lectura con formato, carga, reintento, estado sin descripción/materiales y cierre al juego. Archivos privados usan el mecanismo existente de URL firmada. Recursos compatibles: imágenes, audio, video, PDF, YouTube y Google Docs/Slides/Sheets. Las restricciones de cada proveedor pueden impedir el visor; en ese caso se ofrece abrir el material aparte, conservando el juego. Otros enlaces y formatos descargables también ofrecen esa alternativa.

No se ejecutan scripts ni eventos del HTML de la descripción; se reconstruye una lista permitida de etiquetas. Sesión, matrícula, curso y publicación se comprueban en cada lectura; se excluyen recursos docentes, borradores y padres ambiguos. No se modifican datos ni se inventa contenido académico. La demo local muestra un texto sintético rotulado como demostración, no contenido oficial.

Validación: 74 pruebas del módulo/interfaz aprobadas tras actualizar expectativas de navegación, incluyendo acceso, aislamiento, recursos públicos, fallos, reintentos, respuestas tardías y HTML activo rechazado. TypeScript y lint aprobados. Navegador: lectura de demostración en la pizarra de clase 2 sin cambio de URL. Captura outputs/course-game/pizarra-contenido.jpg. No se probó sesión real ni recursos externos contra producción; sin despliegue.

## Orientación al caminar
El avatar tiene vistas de frente, espalda y ambos perfiles. La orientación sigue el desplazamiento real tras resolver colisiones, permanece estable en diagonales y se conserva al detenerse. Las vistas mantienen la personalización y funcionan en exterior, pasillo y aulas; el retrato del editor sigue de frente.


La caminata usa brazos y piernas articulados en contrafase, perfiles espejados, elevación alternada de pies y balanceo corporal de un píxel con sombra fija. El ciclo avanza por distancia real (32 píxeles por ciclo), se detiene ante colisiones y vuelve a postura neutra al soltar controles o abrir un panel.


## Movimiento con clic o tap
Un clic principal o tap sobre suelo libre selecciona un destino en coordenadas del mundo, independientemente de escala y desplazamiento. La ruta utiliza las colisiones del exterior, pasillo o aula, rodea obstáculos y muestra una marca de destino. Puntos bloqueados o inaccesibles se rechazan. Otro toque reemplaza la ruta; teclado, controles, paneles, pérdida de foco y cambios de escena la cancelan. Los arrastres y gestos cancelados no generan destinos. Las entradas y botones accesibles conservan su comportamiento.


Los botones de entrada al Nodo y puertas de aulas ahora seleccionan un destino al otro lado del umbral: el avatar camina y la escena cambia únicamente al llegar. Activarlos con Enter o espacio tiene el mismo comportamiento. Las rutas conservan las cancelaciones y colisiones del movimiento con clic; la lista de encuentros sigue ofreciendo acceso al contenido.


## Reloj del servidor y aulas por horario
La acción autenticada syncGameScheduleAction obtiene el calendario publicado del curso y Date.now() del servidor Next que ejecuta el juego. El HUD usa America/Argentina/Buenos_Aires; entre sincronizaciones avanza con performance.now(), sin confiar en el reloj civil del dispositivo. Resincroniza cada 15 segundos y al cruzar un inicio, con confirmación del servidor antes de abrir. A los 45 segundos sin sincronización bloquea accesos hasta recuperar conexión.
Las puertas, colisiones, interacción E, lista de encuentros y pizarra respetan classes.date. Fechas vacías o inválidas quedan cerradas como horario por confirmar. La acción de lectura de pizarra vuelve a validar fecha y permisos en el servidor. No modifica horarios ni el comportamiento del aula clásica. Las clases abiertas permanecen disponibles después del inicio; no se impuso un horario de cierre.
La vista Vite obtiene la hora del proceso local mediante /__game-clock (no-store), con calendario de demostración; producción usa los horarios reales consultados con la sesión del alumno. No se hicieron cambios en PocketBase ni despliegue.


## Calendario real en la vista local y Aula 0
El 08/11/2026 se consultaron en PocketBase Epixum el curso 5wdbs1o1p22vszm y sus ocho clases publicadas. La vista local usa una copia verificada de IDs, títulos y fechas en tmp/course-game-preview/cohort-2.json, compartida entre la interfaz y el endpoint del reloj. Los horarios coinciden con el calendario previo: 10, 12, 17, 19, 24 y 26 de noviembre, 1 y 3 de diciembre de 2026, a las 20:00 de Argentina. Es una copia local, no una sincronización permanente con PocketBase; las modificaciones futuras requieren actualizarla. El juego de producción continúa consultando PocketBase con la sesión del alumno.
El HUD muestra solamente fecha y hora. El Aula 0 tiene acceso propio en el centro del pasillo, siempre transitable y disponible sin reloj sincronizado. No consume una de las ocho puertas ni renumera clases/alas. Su introducción es contenido de orientación redactado para el juego; no inventa programa, evaluación ni certificación. Los materiales de las clases en la vista local continúan siendo una muestra.


## Sincronización automática de PocketBase
La copia local de calendario se retiró. El endpoint Vite /__game-clock consulta PocketBase en cada sincronización mediante scripts/course-game-preview-server.mjs; solo devuelve IDs, títulos y fechas de clases publicadas/visibles del curso piloto. Lee credenciales del entorno exclusivamente en el proceso servidor. Está limitado a 127.0.0.1:5188, GET y el origen local; no publica tokens ni usa una copia como respaldo. El reloj y las puertas se refrescan cada 15 segundos y en el inicio de clase. Las consultas tienen timeout y errores sin detalles de autenticación.
El mapa reconcilia el catálogo recibido: horarios, títulos, publicación, nuevas clases y bajas. Conserva la clase seleccionada por ID al reordenarse el calendario y retira el lector si esa clase desaparece. El Aula 0 sigue abierta. El contenido de clases en Vite continúa siendo una muestra; esta sincronización cubre el calendario. La ruta Next sigue usando la sesión del alumno para PocketBase. Se verificó la consulta real sin modificar clases de producción, más pruebas con cambios simulados.


## Perro robot compañero
Se añadió un sprite original dibujado con rectángulos pixel art, inspirado en la referencia aportada: chasis plateado, sensor frontal oscuro, articulaciones y cuatro patas. Tiene frente, espalda y perfiles, con trote diagonal alternado. Usa el mismo renderizador Phaser que el personaje, sin assets remotos ni generación de imágenes en tiempo de ejecución.
Acompaña al alumno en exterior, pasillo y aulas, mantiene 22 píxeles de separación, busca rutas con las colisiones existentes y espera durante paneles o tutorial. Al cambiar de escena aparece junto al personaje en un punto transitable. La opción Tu perro robot en el menú ofrece una pista contextual fija para jardín, pasillo o aula; no es un chatbot ni envía datos a un servicio de IA.


El personaje y el perro robot ahora tienen colisión mutua por sus huellas en el suelo (elipse combinada de 22 × 14 píxeles de radio). Teclado y controles táctiles detienen el movimiento antes de atravesarlo; la navegación con clic usa la misma barrera y recalcula rutas si el perro se interpone. El seguimiento del perro también valida la huella del alumno. Se probaron bloqueo con frames largos, recorrido alrededor, destino ocupado y seguimiento existente.


El compañero detecta la intención de paso del alumno (controles manuales o destino de clic/tap). Si está delante y cerca, busca primero un lateral libre; en pasos estrechos busca un ensanche más adelante, o avanza para dar espacio. Sigue una ruta con colisiones mutuas y espera 1,2 segundos al terminar de apartarse antes de retomar el seguimiento. No se teletransporta ni desactiva la colisión. Se probaron paso por corredor estrecho, navegación por clic, pausa y seguimiento existentes.


## Conversación con el compañero
El perro tiene un botón accesible superpuesto a su posición real, con indicador ?. Clic, tap o activación con teclado abre el panel de conversación y cancela el destino actual. Los arrastres y gestos cancelados no abren el chat. El menú conserva el acceso alternativo. El panel pausa movimiento y seguimiento, y restaura el foco al cerrar.
La conversación ofrece preguntas sugeridas y entrada de texto (500 caracteres), con respuestas locales guiadas por temas: controles, navegación contextual, pizarra, orientación general del curso, trabajos y horarios sincronizados. No usa un modelo generativo ni transmite preguntas a terceros, no corrige trabajos y no inventa contenido de clases. Las preguntas fuera de alcance remiten a las consignas/equipo docente. El historial de esta charla es temporal y se reinicia al cerrar el panel.


La charla del compañero ahora utiliza un diálogo inferior inspirado en juegos rurales pixel art, con marco de madera, retrato original del robot y escenario visible. Las respuestas avanzan por páginas (preferentemente cortadas entre oraciones); al finalizar aparecen las opciones, Otra pregunta y Hasta luego. Enter/espacio avanza cuando el diálogo tiene foco; Escape lo cierra. Se conserva la pausa y restauración del foco del juego, sin burbujas ni historial de chat. El diseño se adapta a pantallas pequeñas con desplazamiento interno cuando hace falta.


Los diálogos revelan el texto cada 28 ms. Clic/tap sobre el recuadro, Enter o espacio completa la página si está escribiéndose; una segunda activación avanza. Las opciones aparecen al completar la última página. El texto reserva su altura para evitar saltos durante la escritura y los lectores de pantalla reciben la página completa, sin anuncios por letra. Se respeta prefers-reduced-motion y se limpian los temporizadores al cerrar o cambiar de página. Se verificó completar sin avanzar, continuación, preferencias de movimiento y cierre.

Durante la creación del personaje se elige el nombre del perro robot (1 a 24 caracteres, sin espacios exteriores). Se guarda como `character.petName` en el JSON de bienvenida existente, sin migración adicional, y se muestra en el menú y en el retrato de las conversaciones. Los personajes anteriores sin ese campo conservan «Perro robot». La vista de demostración mantiene el nombre solamente durante la sesión, como el resto del personaje. Se verificaron validación, conservación al volver atrás, envío al guardado y compatibilidad con personajes anteriores.


El menú incluye «Mi personaje y mis datos»: abre el editor con la apariencia, mascota y perfil actuales. Guardar usa una acción autenticada independiente de la bienvenida, actualiza usuario y personaje en un batch y conserva los pasos del recorrido. Cancelar descarta el borrador. Los errores mantienen los datos para reintentar. El mapa sigue montado y pausado durante la edición, y aplica la nueva apariencia al guardar. El email editado es el de contacto; no cambia el acceso. En la demostración los cambios son temporales y no salen del navegador.

## Entorno urbano del Nodo

El exterior recrea en pixel art la distribución observada alrededor del Nodo: Güemes al norte, Colón al oeste, Caseros al este y Buenos Aires al sur, con la plaza Raúl Alfonsín, manzanas vecinas y un volumen al sudeste del predio. Referencias: vista satelital de Google Maps centrada en -28.4767767,-65.7862141 y https://www.catamarcaciudad.gob.ar/el-nodo-tecnologico-ya-es-una-realidad/. Se dibuja con primitivas originales, sin incorporar imágenes o teselas del proveedor. La escala y los edificios vecinos están simplificados para jugar; no es una reproducción catastral. La fachada del Nodo se conserva a escala reducida. Se adaptaron colisiones, destino de entrada, proximidad y rutas; el río ficticio se retiró. Los interiores y clases conservan su funcionamiento.

## Barrio ampliado y cámara

Se revisó nuevamente la referencia satelital a dos escalas el 8/11/2026 (https://www.google.com/maps/@-28.4772,-65.7868,17z/data=!3m1!1e3). Se corrigió el predio longitudinal norte-sur, el desfase entre Colón y Virgen del Valle al llegar a Güemes, los finales de San Juan y La Rioja a ambos lados del predio, y el cambio Mendoza/Buenos Aires. Se incorporaron senderos diagonales, explanada del sudoeste, volúmenes largos al sudeste y manzanas al norte, este, oeste y sur. Calles rectificadas y proporciones adaptadas para jugar: no hay georreferenciación métrica. Las parcelas y fachadas vecinas son ilustrativas; no se afirma que representen cada inmueble real.

Mundo exterior de 960 × 960 píxeles lógicos (6 veces el área anterior), renderizado a escala 2. La cámara es el viewport del canvas completo y sus controles HTML: se centra en cada posición del personaje, se limita al borde y reencuadra al redimensionar. Los interiores siguen en 480 × 320. Los clics y la mascota usan las dimensiones de la escena activa. A* con cola prioritaria y colisiones por sectores sustituye la búsqueda exhaustiva para que las rutas largas no congelen el juego. Se verificaron recorridos entre calles, acceso al Nodo, seguimiento y límites de cámara, clic/tap y mascota.

El Nodo tiene también un acceso jugable trasero en su borde norte: clic/tap dirige al personaje alrededor del edificio, cruzar el umbral entra automáticamente y E funciona al acercarse. Ambos accesos llevan al interior existente. Se dibujó una entrada discreta sin carteles y se conserva la colisión del resto del edificio. Es una incorporación de jugabilidad solicitada, no una afirmación arquitectónica sobre el edificio real.

El acceso trasero se representa ahora mediante cuatro escalones y un descanso exterior, sin puerta sobre el letrero NODO. El destino y la activación automática están en el primer escalón (y=277), fuera de la fachada; el ancho de interacción acompaña la escalinata. El resto de la pared trasera permanece bloqueado.

Los accesos del Nodo conservan ahora su lado: frente → vestíbulo sur; escalinata trasera → vestíbulo norte. La salida norte (caminando, clic/tap o E al acercarse) devuelve al exterior detrás de la escalinata, fuera del umbral para evitar reingresos inmediatos. El Aula 0 se reubicó junto al pasillo norte para liberar la salida. Las cinco gradas traseras igualan el ancho máximo frontal: ceil(116 × 0.65) = 76 píxeles lógicos. El interior continúa siendo una interpretación jugable, no un plano arquitectónico real.

## Orientación corregida: sur arriba

Por indicación del usuario, el mapa gira 180 grados: sur arriba, norte abajo, este a la izquierda y oeste a la derecha. La brújula fija lo explicita. La geometría de calles, edificios vecinos, canteros y árboles se transforma de norte-arriba a sur-arriba; los sprites y textos conservan orientación legible. Se corrige también la fachada principal del Nodo: mira a Güemes y a la llegada desde Virgen del Valle (abajo), mientras la plaza queda detrás (arriba). Los accesos, rutas, colisiones y puntos de aparición usan las nuevas coordenadas. La salida principal del interior está abajo/norte y la trasera arriba/sur; esto reemplaza las referencias geográficas anteriores de los vestíbulos en esta documentación. Se verificaron ambas rutas y 35 pruebas de movimiento/orientación, con TypeScript y lint.

### Zoom del mapa
Controles −/+/porcentaje (50–200%) y pellizco con dos dedos. El zoom conserva el punto elegido y escala juntos el canvas y los accesos HTML. Un dedo desplaza el mapa; los gestos no activan puertas ni conversaciones. Funciona también dentro del Nodo y de las aulas.

El zoom también admite la rueda del mouse sobre el mapa: hacia arriba acerca y hacia abajo aleja, con límites de 50–200 %. Se evita el desplazamiento simultáneo y se desactiva mientras hay un panel o tutorial abierto. El pellizco del touchpad (Ctrl+wheel) controla el mapa; Meta conserva el comportamiento del navegador.

### Preparación del servidor antes de publicar
Ejecutar `npm run schema:course-game` antes de habilitar la aventura en producción. Las colecciones privadas course_game_onboarding y course_game_tour_steps son necesarias también para la primera visita, aunque el alumno todavía no tenga personaje. Una colección ausente produce el error de apertura del valle. La migración no modifica perfiles ni crea personajes.
Verificación de despliegue: establecer COURSE_GAME_ACCESS_CHECK=1 y ejecutar vitest run lib/course-game/access.integration.test.ts. Comprueba las funciones reales de carga del curso y bienvenida con una identidad invitada y solo realiza lecturas. No imprime datos personales ni tokens.

### Revisión de calles del entorno (8/11/2026)

Se contrastó la red con la [vista satelital de Google Maps](https://www.google.com/maps/@-28.4772,-65.7868,17z/data=!3m1!1e3), ampliando los sectores norte y sur. La [descripción municipal del Nodo](https://www.catamarcaciudad.gob.ar/el-nodo-tecnologico-ya-es-una-realidad/) confirma su ubicación sobre Güemes, entre Colón y Caseros.

- Colón conserva su continuidad a ambos lados de Güemes. Se distinguen los nombres Caseros/Tierra del Fuego, Ayacucho/Entre Ríos y General Lavalle/La Pampa al cruzar esa avenida.
- Se agregaron los tramos visibles de General Navarro, Junín al sur de San Juan, pasaje Esquiú y los dos tramos desplazados de pasaje Mendoza. Se mantienen San Juan y La Rioja a ambos lados del predio, sin inventar una conexión a través de la plaza. Mendoza/Buenos Aires delimitan el extremo sur del predio; Florida continúa por el borde del mundo.
- Todas las veredas se dibujan antes del asfalto para evitar falsos cortes en las intersecciones. Las viviendas ilustrativas que invadían calles nuevas o veredas se retiran del dibujo y de las colisiones. Se elimina el margen superior de movimiento que bloqueaba Florida tras girar el mapa.
- Las pruebas recorren el eje de cada tramo, comprueban su conexión desde el punto inicial, los cambios de nombre en Güemes y la ausencia de veredas sobre los cruces.

Es una recreación rectificada para el juego: se conservan calles y conexiones observadas, pero pendientes, distancias, curvas y fachadas no tienen precisión catastral. No se modelan sentidos de tránsito ni todos los pasajes menores de la ciudad.

### Cámara, mascota y foco del zoom

El zoom con rueda y touchpad conserva el punto bajo el cursor; el pellizco táctil sigue el punto medio entre los dedos y los botones usan el centro visible. Al reanudar la caminata, la cámara vuelve progresivamente al personaje con interpolación temporal, sin retrasar su movimiento. Un nuevo zoom, arrastre, panel o cambio de escena cancela la transición. El primer encuadre de cada escena es inmediato y se respeta la preferencia de movimiento reducido. El margen del mundo ocupa al menos media ventana en cada lado para que la cámara también pueda centrarlo junto a los bordes, sin recortarlo. El touchpad se reconoce por los eventos wheel con ctrlKey y cancela el zoom del navegador solo sobre el mapa activo.

El exterior reserva 40 unidades de dibujo a cada lado del lienzo, con márgenes equivalentes en la cámara. Así, el personaje sigue completo al llegar al borde sur (arriba), incluso sobre Florida. La cámara incluye los márgenes al calcular ambos ejes.

El perro recibe la dirección del próximo tramo del recorrido antes de avanzar el personaje. Si vuelve a bloquear el paso durante su descanso o una maniobra queda bloqueada, vuelve a planificar sin exigir otro clic. La ruta del alumno se calcula contra el entorno estático y conserva la colisión con la mascota durante cada paso.

### Personalización del personaje

El editor permite elegir calvicie, coleta, barba corta o abundante, blusa con pantalón, blusa con falda y vestido. La silueta femenina tiene cintura, hombros y mandíbula diferenciados. Las prendas y rasgos se representan en las cuatro direcciones con el mismo dibujo compartido por el retrato y Phaser. Los botones de orientación permiten revisar el resultado antes de guardar. El catálogo se filtra por personaje: hombre ofrece pelo corto, rizado o calvicie, barba y camisa/jardinero; mujer ofrece pelo corto, largo, rizado o coleta, sin barba, y blusa, falda, vestido, camisa o jardinero. Anteojos y sombrero están disponibles para ambos. Al cambiar se reemplazan las opciones incompatibles por valores válidos, conservando colores y mascota. La misma normalización se aplica al leer personajes anteriores y al guardar en el servidor. El vestido oculta el selector de color de pantalón.

El campo de barba se guarda dentro del JSON del personaje. Los personajes existentes que no lo tienen se leen como sin barba, sin migrar ni reemplazar sus demás elecciones.

### Árboles y profundidad

Los árboles y las palmeras del Nodo se dibujan como objetos independientes, ordenados por la base del tronco junto al personaje y su mascota. El follaje tapa a quien pasa por detrás, y quien pasa por delante se dibuja encima. Las sombras permanecen en el suelo. Solo la base de los troncos bloquea caminar y calcular rutas; las copas no son obstáculos. Se incluyen las dos palmeras del edificio en las colisiones.

### Sentarse en los bancos

Los cuatro bancos de la plaza y los dos bancos de hormigón del Nodo tienen objetivos accesibles para clic, tap y teclado. El personaje recorre una ruta hasta un punto libre frente al banco antes de adoptar la postura sentada; no se teletransporta desde lejos ni atraviesa el asiento. Se levanta al elegir otro destino, pulsar flechas/WASD o usar Levantarse. Los gestos de zoom no activan bancos. Se mantiene sentado al abrir y cerrar un panel; cambiar de escena reinicia la postura. Las colisiones incluyen ambos tipos de banco.
