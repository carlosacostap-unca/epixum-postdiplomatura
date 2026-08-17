## 1. Esquema y modelo de datos

- [x] 1.1 Añadir a los tipos de dominio `Course.contentsEnabled`, la entidad `CourseContent` y el tercer padre `Link.content`, con pruebas de los auxiliares nuevos.
- [x] 1.2 Crear la migración idempotente que agregue `courses.contentsEnabled`, la colección `course_contents`, su índice de orden y la relación `links.content`.
- [x] 1.3 Definir reglas de PocketBase para contenidos, recursos con padre exclusivo y protección de `contentsEnabled`, y actualizar los scripts semanal y de invitaciones para que conservar esas reglas no dependa del orden de ejecución.
- [x] 1.4 Ampliar las pruebas simuladas de esquema para verificar primera ejecución, repetición, órdenes distintos entre migraciones y conservación de campos, índices, reglas y datos previos.

## 2. Configuración administrativa

- [x] 2.1 Incorporar al formulario de alta y edición de cursos el control “Habilitar contenidos”, desmarcado por defecto y con una explicación de que deshabilitar conserva los datos.
- [x] 2.2 Normalizar y persistir `contentsEnabled` únicamente en las acciones administrativas de creación y actualización, revalidando las superficies de los tres roles.
- [x] 2.3 Probar creación, edición, valor por defecto y rechazo de cambios realizados por docentes o estudiantes.

## 3. Dominio y acciones de contenidos

- [x] 3.1 Implementar consultas de lista y detalle ordenadas por `position`, siempre filtradas por curso y con carga explícita de recursos.
- [x] 3.2 Implementar validadores reutilizables de alcance para docente asignado, estudiante matriculado, curso habilitado y coincidencia entre ruta, contenido y curso.
- [x] 3.3 Implementar acciones docentes de creación, edición y eliminación con título validado, descripción enriquecida, posición final y revalidación de rutas.
- [x] 3.4 Implementar el reordenamiento mediante secuencia completa validada y actualizaciones compensables, incluyendo rechazo de identificadores faltantes, duplicados o pertenecientes a otro curso.
- [x] 3.5 Cubrir consultas, acciones, reordenamiento y alternancia reversible con pruebas unitarias de casos autorizados y negativos.

## 4. Recursos de contenidos

- [x] 4.1 Generalizar la resolución de padre y curso de los recursos para aceptar discriminadamente clase, trabajo práctico o contenido independiente.
- [x] 4.2 Adaptar alta, edición, eliminación y descarga de enlaces o archivos para contenidos, exigiendo un único padre y bloqueando cursos deshabilitados o fuera de alcance.
- [x] 4.3 Reutilizar o extraer los componentes de gestión y lectura de recursos para que funcionen en contenidos sin alterar las experiencias actuales de clases y trabajos.
- [x] 4.4 Añadir pruebas de padres válidos e inválidos, permisos, matrícula, característica deshabilitada y descarga autenticada.

## 5. Experiencia docente

- [x] 5.1 Añadir condicionalmente la pestaña “Contenidos” al contexto docente sin mezclarla con semanas ni con las secciones tradicionales.
- [x] 5.2 Crear la lista docente con estado vacío, alta, edición, eliminación confirmada y controles accesibles para mover contenidos hacia arriba o abajo.
- [x] 5.3 Crear formularios de alta y edición con título y descripción enriquecida, y una vista de detalle para administrar recursos.
- [x] 5.4 Probar navegación condicional, orden visual, operaciones docentes y bloqueo de rutas para cursos deshabilitados o ajenos.

## 6. Experiencia estudiantil

- [x] 6.1 Añadir condicionalmente la pestaña “Contenidos” al contexto estudiantil tanto en cursos tradicionales como semanales.
- [x] 6.2 Crear la lista estudiantil ordenada y el detalle de sólo lectura con descripción enriquecida y recursos autorizados.
- [x] 6.3 Probar visibilidad inmediata, orden persistido, ausencia de relación con semanas y bloqueo para estudiantes no matriculados o cursos deshabilitados.

## 7. Verificación integral

- [x] 7.1 Crear o ampliar la verificación contra PocketBase real con una matriz de admin, docente asignado, docente ajeno, estudiante matriculado y estudiante ajeno, incluyendo acceso directo a contenidos y recursos.
- [x] 7.2 Ejecutar las pruebas de esquema, acciones y componentes afectadas, corregir regresiones y registrar el resultado.
- [x] 7.3 Ejecutar lint y build de producción para validar tipos, rutas de App Router y renderizado de las nuevas pantallas.
- [x] 7.4 Verificar manualmente el flujo completo: habilitar, crear, adjuntar recursos, reordenar, consultar como estudiante, deshabilitar, comprobar bloqueo y reactivar conservando datos y orden.
