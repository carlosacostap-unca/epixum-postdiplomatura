## 1. Dominio y persistencia

- [x] 1.1 Definir tipos, normalización de registros históricos y funciones puras para versionar entregas, derivar estados y validar transiciones; cubrirlas con pruebas unitarias.
- [x] 1.2 Crear una migración PocketBase idempotente para agregar metadatos e historial, endurecer las reglas de escritura y backfillear entregas existentes sin inferencias ambiguas.
- [x] 1.3 Crear y probar el informe/aplicador explícito de candidatos históricos para regularizar reenvíos confirmados de la cohorte 6.

## 2. Acciones y preevaluación

- [x] 2.1 Adaptar las acciones de creación y actualización por archivos y URL para escribir mediante servicio, aplicar propiedad/plazo/veredicto y registrar cada versión de forma atómica.
- [x] 2.2 Asociar borradores y publicaciones a la versión vigente y rechazar evaluaciones o adopciones de IA obsoletas; agregar pruebas de autorización y concurrencia.
- [x] 2.3 Actualizar descargas e invalidaciones de rutas para soportar intentos históricos y reflejar inmediatamente los reenvíos en las vistas afectadas.

## 3. Experiencia estudiantil

- [x] 3.1 Mostrar estados coherentes en el curso, detalle del TP y panel estudiantil, incluyendo `Corrección solicitada`, `Reenviado · pendiente de revisión` y resultados finales.
- [x] 3.2 Habilitar un único reenvío posterior al vencimiento cuando corresponda y bloquear modificaciones de entregas aprobadas o desaprobadas.
- [x] 3.3 Mostrar el historial de intentos y la devolución anterior sin exponer borradores ni preevaluaciones privadas; cubrir el componente con pruebas.

## 4. Experiencia docente

- [x] 4.1 Incorporar `Reenviado` al listado, filtro y contadores del TP, y diferenciar correcciones solicitadas de resultados finales.
- [x] 4.2 Actualizar los paneles global y de curso para incluir y etiquetar reenvíos pendientes con fecha del intento vigente.
- [x] 4.3 Mostrar el historial de intentos al docente y enviar la versión esperada al guardar o publicar una evaluación.

## 5. Verificación y operación

- [x] 5.1 Ejecutar las pruebas de esquema, dominio, acciones y componentes relacionadas y corregir regresiones.
- [x] 5.2 Ejecutar lint, comprobación TypeScript y build de producción conforme a los scripts disponibles.
- [x] 5.3 Documentar comandos de migración, informe, confirmación manual y rollback, y validar estrictamente los artefactos OpenSpec.
