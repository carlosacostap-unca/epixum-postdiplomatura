## 1. Esquema y migración de PocketBase

- [x] 1.1 Auditar los campos y reglas vigentes de `courses`, `classes`, `assignments` e `inquiries` y registrar las diferencias que la migración debe preservar.
- [x] 1.2 Extender el script idempotente de esquema con `courses.organizationMode`, la colección `course_weeks`, el índice único por curso y número y las relaciones `week` opcionales.
- [x] 1.3 Configurar relaciones sin cascada hacia el contenido y reglas iniciales de lectura y escritura para administradores, docentes asignados y estudiantes matriculados.
- [x] 1.4 Actualizar el snapshot y la documentación del esquema sin incluir credenciales ni valores reales del entorno.
- [x] 1.5 Añadir una prueba de migración que verifique primera ejecución, reejecución, valor tradicional por defecto y conservación de todos los registros existentes.

## 2. Modelo de dominio, visibilidad y autorización

- [x] 2.1 Incorporar tipos para modalidad, semana, estados, programación y relaciones opcionales en cursos, clases, trabajos y consultas.
- [x] 2.2 Implementar y probar un único cálculo de visibilidad efectiva para semanas publicadas y programadas según la hora actual.
- [x] 2.3 Implementar y probar validadores de número entero no negativo único, título, rango de fechas y publicación programada obligatoria.
- [x] 2.4 Implementar controles reutilizables de curso semanal, docente asignado y pertenencia de la semana al mismo curso que su contenido.
- [x] 2.5 Adaptar consultas compartidas para distinguir modalidad tradicional, semanas visibles y contenido sin asignar sin duplicar resultados.

## 3. Configuración administrativa de cursos

- [x] 3.1 Añadir al formulario administrativo la modalidad tradicional o semanal con una explicación de sus efectos y compatibilidad.
- [x] 3.2 Actualizar las acciones de creación y edición para aceptar `organizationMode` solamente con rol administrador y usar `tradicional` por defecto.
- [x] 3.3 Revalidar portadas y contextos de los tres roles al cambiar la modalidad sin crear, borrar ni reasignar semanas o contenido.
- [x] 3.4 Añadir pruebas de creación, alternancia reversible, persistencia de relaciones y rechazo de cambios solicitados por docentes o estudiantes.

## 4. Operaciones docentes sobre semanas

- [x] 4.1 Implementar consultas docentes de semanas ordenadas, cantidades por tipo de contenido y bandeja sin asignar limitada al curso autorizado.
- [x] 4.2 Implementar acciones para crear, editar y publicar semanas con validación de modalidad, asignación docente, fechas, estado y número único.
- [x] 4.3 Implementar programación de publicación mediante visibilidad temporal derivada, sin cron ni transición persistente obligatoria.
- [x] 4.4 Implementar eliminación confirmada de una semana preservando sus clases, trabajos y consultas como contenido sin asignar.
- [x] 4.5 Implementar acciones para asignar, mover y desasignar contenido, rechazando semanas pertenecientes a otro curso.
- [x] 4.6 Añadir pruebas unitarias y de alcance para CRUD, publicación, programación, eliminación, concurrencia de números y operaciones de docentes ajenos.

## 5. Experiencia docente semanal

- [x] 5.1 Adaptar el contexto del curso docente para alternar entre la vista tradicional vigente y un gestor semanal ordenado por número.
- [x] 5.2 Crear formularios accesibles de alta y edición de semana con estados de carga, validación por campo y feedback compartido.
- [x] 5.3 Mostrar estado, fechas opcionales, programación y conteos de contenido en cada semana con acciones permitidas al docente asignado.
- [x] 5.4 Crear la bandeja “Sin asignar” para clases, trabajos y consultas con controles de selección utilizables por teclado y dispositivos táctiles.
- [x] 5.5 Integrar el selector opcional de semana en formularios de clases y trabajos y preseleccionarlo al crear desde una semana.
- [x] 5.6 Verificar la gestión semanal a 320 píxeles, zoom de 200 por ciento, teclado y movimiento reducido sin depender de arrastrar y soltar.

## 6. Experiencia y acceso del estudiante

- [x] 6.1 Implementar consultas estudiantiles que devuelvan solamente semanas efectivamente visibles y contenido asignado de cursos matriculados.
- [x] 6.2 Rediseñar el curso semanal del estudiante agrupando semanas por número y conservando fechas, recursos, vencimientos y estados de entrega.
- [x] 6.3 Mantener la presentación plana vigente para cursos tradicionales aunque su contenido conserve relaciones semanales internas.
- [x] 6.4 Exigir una semana visible al crear consultas estudiantiles semanales y derivarla de la clase o trabajo cuando exista contexto.
- [x] 6.5 Adaptar foros y filtros para semana y ocultar consultas generales o sin asignar en modalidad semanal.
- [x] 6.6 Proteger detalles, recursos, entregas, consultas y respuestas contra URLs directas hacia semanas no visibles o contenido sin asignar.
- [x] 6.7 Actualizar próximas acciones y portadas para ignorar contenido semanal todavía oculto sin alterar los resultados de cursos tradicionales.

## 7. Defensa en profundidad y reglas reales

- [x] 7.1 Alinear las reglas de `course_weeks`, clases, trabajos y consultas con matrícula, asignación docente, modalidad y visibilidad temporal efectiva.
- [x] 7.2 Verificar con identidades reales o impersonadas que administradores sólo configuran modalidad, docentes asignados gestionan semanas y docentes ajenos son rechazados.
- [x] 7.3 Verificar que un estudiante matriculado no puede consultar por API semanas borrador, programadas para el futuro ni contenido sin asignar.
- [x] 7.4 Probar que relaciones manipuladas entre cursos distintos son rechazadas por las acciones del servidor y no conceden acceso mediante PocketBase.

## 8. Regresión y entrega

- [x] 8.1 Añadir recorridos automatizados para crear semanas, publicar, programar, organizar contenido, consultar como estudiante y alternar modalidades.
- [x] 8.2 Ejecutar pruebas de regresión de matrículas, cursos tradicionales, clases, trabajos, entregas, evaluaciones, consultas y archivos.
- [x] 8.3 Ejecutar TypeScript, lint, pruebas automatizadas, build de producción y validación OpenSpec estricta.
- [x] 8.4 Documentar el modelo semanal, estados efectivos, permisos, migración, rollback y criterios de aceptación para futuras pantallas.
