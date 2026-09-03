## 1. Preparación y salvaguardas

- [x] 1.1 Leer la documentación local de Next.js 16 aplicable a layouts anidados, Server Actions, búsqueda por parámetros y revalidación antes de modificar las rutas administrativas.
- [x] 1.2 Mapear las páginas, acciones, componentes y pruebas actuales de cursos, matrículas e invitaciones y registrar qué piezas se reutilizan, trasladan o retiran.
- [x] 1.3 Ampliar la auditoría de roles para detectar matrículas duplicadas, participación docente-estudiante en el mismo curso, referencias ausentes y relaciones potencialmente destructivas, sin modificar registros.
- [x] 1.4 Añadir pruebas de la auditoría que cubran datos históricos vinculados a usuarios y cursos antes y después de retirar una participación.

## 2. Lecturas y contratos de participantes

- [x] 2.1 Definir tipos compartidos para participantes, conteos, páginas de resultados, candidatos compatibles y resultados discriminados de mutaciones administrativas.
- [x] 2.2 Implementar una lectura administrativa de alumnos matriculados por curso con expansión mínima del usuario, búsqueda escapada por nombre o correo, paginación y conteo.
- [x] 2.3 Implementar una lectura administrativa de docentes por curso con búsqueda, paginación y conteo a partir de `courses.teachers`.
- [x] 2.4 Implementar la búsqueda paginada de cuentas candidatas desde dos caracteres, diferenciando cuentas disponibles, ya incorporadas e incompatibles por la participación opuesta.
- [x] 2.5 Añadir pruebas unitarias de filtros, escape de búsqueda, paginación, conteos, estados vacíos y clasificación de candidatos.

## 3. Mutaciones administrativas seguras

- [x] 3.1 Implementar una guardia reutilizable que obtenga la sesión del servidor y rechace las acciones de participantes cuando la identidad no posea privilegio global `admin`.
- [x] 3.2 Implementar el alta múltiple de alumnos validando curso, usuarios, unicidad y exclusividad para todo el conjunto antes de crear las matrículas mediante un batch atómico de PocketBase.
- [x] 3.3 Implementar el retiro de un alumno validando que la matrícula indicada pertenece al curso y eliminando únicamente ese registro de `course_enrollments`.
- [x] 3.4 Implementar el alta múltiple de docentes desde el estado vigente de `courses.teachers`, rechazando personas matriculadas en el mismo curso y persistiendo la relación una sola vez.
- [x] 3.5 Implementar el retiro de un docente desde el estado vigente, eliminando únicamente su identificador de `courses.teachers`.
- [x] 3.6 Releer el estado exacto después de cada mutación, devolver resultados `success`, `conflict`, `not-found`, `forbidden` o `error` y revalidar sólo las superficies administrativas, docentes y estudiantiles afectadas.
- [x] 3.7 Añadir pruebas de acciones para invocación no autorizada, identificadores manipulados, duplicados, incompatibilidad en el mismo curso, participación válida en cursos distintos, cambio concurrente, atomicidad del lote y verificación posterior.

## 4. Contexto administrativo del curso

- [x] 4.1 Crear el layout compartido de `/admin/courses/[id]` con encabezado del curso y navegación accesible entre Configuración, Participantes y Acceso.
- [x] 4.2 Mantener la edición general en Configuración y retirar de `CourseForm` el selector múltiple nativo de docentes cuando la nueva superficie esté disponible.
- [x] 4.3 Crear el destino Acceso reutilizando la modalidad, clave e invitaciones existentes y mostrar explícitamente que Epixum no envía emails.
- [x] 4.4 Conservar enlaces o redirecciones desde los destinos anteriores y ajustar el flujo posterior a crear un curso para facilitar la asignación de participantes.
- [x] 4.5 Añadir pruebas de rutas, autorización administrativa, destino activo, enlaces conservados y navegación por teclado.

## 5. Experiencia de gestión de participantes

- [x] 5.1 Crear la página Participantes con conteos y pestañas semánticas para Alumnos, Docentes e Invitaciones, preservando el filtro activo en la URL.
- [x] 5.2 Implementar búsqueda y paginación de miembros con tabla en escritorio, tarjetas en móvil, estados de carga, resultados, ausencia de datos y errores anunciados.
- [x] 5.3 Construir un diálogo reutilizable para incorporar personas con búsqueda remota, selección múltiple, motivos accesibles de incompatibilidad, control completo por teclado y restauración del foco.
- [x] 5.4 Conectar los flujos Agregar alumnos y Agregar docentes, manteniendo la selección ante errores recuperables, bloqueando confirmaciones repetidas y refrescando conteos y listas desde el estado persistido.
- [x] 5.5 Construir la confirmación de retiro con persona, curso, participación e impacto explícitos, y conectar las bajas de alumno y docente sin ofrecer conversión automática.
- [x] 5.6 Integrar las invitaciones en el contexto de Participantes y enlazar al destino Acceso cuando la persona todavía no tenga cuenta.
- [x] 5.7 Añadir pruebas de componentes para pestañas, búsqueda, selección, candidatos incompatibles, foco, teclado, anuncios, errores recuperables, confirmación y presentación responsive.

## 6. Reglas y conservación de datos

- [x] 6.1 Verificar mediante snapshot de esquema que los clientes regulares continúen sin poder crear matrículas y que las lecturas existentes de alumnos, docentes y administradores conserven su alcance.
- [x] 6.2 Si la verificación demuestra que hace falta un ajuste, crear un script idempotente y probado para las reglas de `courses` o `course_enrollments`, con snapshot previo y restauración verificable; si no hace falta, documentar la evidencia y no modificar el esquema.
- [x] 6.3 Añadir pruebas de integración que retiren una matrícula y una asignación docente y demuestren que permanecen cuentas, invitaciones, entregas, consultas, respuestas, evaluaciones, archivos y participaciones en otros cursos.
- [x] 6.4 Extender la verificación real de PocketBase para cubrir altas administrativas, rechazo de clientes regulares, exclusividad dentro del curso y roles distintos en cursos diferentes.

## 7. Validación integral y entrega

- [x] 7.1 Ejecutar las pruebas unitarias y de componentes afectadas y corregir cualquier regresión en cursos, matrículas, invitaciones o navegación.
- [x] 7.2 Ejecutar las pruebas de esquema y las verificaciones reales de acceso contra un entorno controlado, confirmando que la auditoría no modifica información.
- [x] 7.3 Añadir y ejecutar un flujo E2E administrativo completo para listar, buscar, agregar y retirar alumnos y docentes en escritorio y viewport móvil.
- [x] 7.4 Ejecutar lint, chequeo de tipos y build de producción con la versión local de Next.js.
- [x] 7.5 Revisar manualmente foco, navegación sólo con teclado, lector de pantalla, mensajes de conflicto y comportamiento frente a dos administradores concurrentes.
- [x] 7.6 Documentar el despliegue y rollback sin migración de registros, ejecutar una auditoría previa y posterior y confirmar que los conteos y relaciones existentes permanecen intactos.
