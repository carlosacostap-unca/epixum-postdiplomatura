## Context

La sesión de PocketBase expone hoy un único `users.role`, y el login, los layouts, numerosas páginas, Server Actions y reglas de colección lo usan para decidir entre administración, docencia y estudio. Sin embargo, el alcance real ya está representado por curso: `courses.teachers` identifica docentes asignados y `course_enrollments` identifica estudiantes matriculados. Las consultas principales también parten de esas relaciones.

La solución debe conservar esas fuentes de verdad, las URLs actuales, Google OAuth y la cookie HttpOnly. Véase `proposal.md` para la motivación y los specs delta para el comportamiento requerido. El cambio `redesign-role-based-experience` ya implementado pero todavía no archivado modifica algunos de los mismos requisitos de navegación y debe consolidarse antes de archivar este cambio para no perder requisitos de experiencia.

## Goals / Non-Goals

**Goals:**

- Centralizar la resolución de espacios y permisos para que páginas, acciones y navegación no interpreten `users.role` de manera diferente.
- Conservar sin reescritura las asignaciones docentes y matrículas vigentes.
- Autorizar cada operación con la relación del mismo curso al que pertenece el recurso.
- Habilitar docencia y estudio simultáneos en cursos diferentes y bloquear la combinación dentro del mismo curso.
- Desplegar reglas y aplicación en un orden reversible, con evidencia comparable antes y después.

**Non-Goals:**

- Reemplazar inmediatamente `courses.teachers` y `course_enrollments` por una colección genérica de membresías.
- Eliminar el campo `users.role` o migrar masivamente sus valores en esta entrega.
- Cambiar Google OAuth, la sesión, las URLs de las áreas o las modalidades de matrícula.
- Resolver automáticamente conflictos preexistentes eligiendo qué participación conservar.
- Cambiar el alcance funcional de administradores, docentes o estudiantes dentro de un curso una vez autorizado.

## Decisions

### 1. Mantener las relaciones actuales como fuentes de verdad

La docencia se resolverá desde `courses.teachers` y el estudio desde `course_enrollments`. No se añadirá una lista global de roles ni una colección de membresías en esta etapa.

Esta decisión evita copiar relaciones, conserva los IDs de matrícula y aprovecha filtros, expansiones e índices ya usados en producción. Convertir `users.role` en un campo multiselección fue descartado porque no expresaría en qué curso aplica cada rol. Crear una colección unificada sería conceptualmente limpio, pero aumentaría el riesgo de migración y obligaría a sincronizar invitaciones, matrículas y relaciones docentes sin necesidad para el caso actual.

### 2. Tratar `users.role` como privilegio administrativo y valor de compatibilidad

Durante la transición, `role === "admin"` seguirá otorgando el privilegio global vigente. Los valores `docente` y `estudiante` se conservarán para compatibilidad de registros, pero no autorizarán por sí solos operaciones de curso. Una asignación o matrícula tampoco reescribirá `users.role`.

Conceder o retirar administración seguirá siendo una acción exclusiva de otro administrador. Al retirar `admin`, la cuenta volverá a un valor regular compatible sin alterar ninguna asignación docente ni matrícula. La interfaz dejará de presentar `docente` y `estudiante` como estados globales entre los cuales convertir a una persona.

Se descarta eliminar el campo en esta entrega porque está incluido en el token y consumido por código y reglas existentes; hacerlo a la vez ampliaría innecesariamente el rollback.

### 3. Introducir una resolución central de capacidades

La aplicación calculará capacidades con reglas únicas:

- `isAdmin`: el registro autenticado posee privilegio global `admin`.
- `canUseStudyWorkspace`: existe una sesión válida; los cursos visibles siguen limitados a matrículas propias y esto permite iniciar una matrícula.
- `canUseTeachingWorkspace`: la identidad aparece en `teachers` de al menos un curso.
- `canTeachCourse(courseId)`: la identidad aparece en `teachers` de ese mismo curso, o la operación admite explícitamente el alcance administrativo.
- `canStudyCourse(courseId)`: existe `course_enrollments(courseId, userId)`.

Las páginas y acciones resolverán primero el curso del recurso y luego la capacidad correspondiente. Un permiso en el curso A nunca satisfará una operación del curso B. Los helpers existentes de alcance docente y estudiantil se consolidarán alrededor de este modelo.

### 4. Derivar el espacio activo de la ruta y ofrecer cambio de espacio

El shell no recibirá una única navegación seleccionada por `user.role`. Derivará el espacio activo de `/admin`, `/docentes` o `/estudiantes` y recibirá la lista de espacios disponibles calculada en el servidor.

El espacio de estudio estará disponible para toda cuenta autenticada porque también contiene el flujo para sumarse a un curso. Docencia aparecerá cuando exista al menos una asignación y administración cuando exista el privilegio global. Si hay más de uno, el shell mostrará un selector accesible; con uno solo, no añadirá complejidad visual.

La ruta raíz y el retorno de OAuth conservarán como preferencia inicial el espacio compatible con el valor global existente cuando esté autorizado: administración, luego docencia para cuentas docentes con cursos asignados y, en los demás casos, estudio. Esta preferencia no oculta los otros espacios ni constituye una autorización.

### 5. Aplicar exclusividad en las dos vías de escritura

Antes de crear una matrícula por clave o invitación, la Server Action leerá el curso mediante el cliente de servicio, comprobará que la identidad no esté en `teachers` y recién entonces persistirá. Antes de guardar la lista docente de un curso, la acción administrativa consultará matrículas para cada docente nuevo y rechazará toda intersección, conservando el estado previo completo.

Las acciones devolverán un error específico de conflicto y nunca convertirán una participación eliminando la otra. Las pruebas cubrirán ambas direcciones y cursos distintos. Como `courses.teachers` y `course_enrollments` son estructuras separadas, la auditoría también detectará cualquier inconsistencia introducida fuera de estos flujos autorizados.

Una colección única con restricción `(course, user)` fue considerada para imponer exclusividad estructural, pero se difiere porque duplicaría o reemplazaría datos productivos. Si en el futuro aparecen más roles por curso o escrituras desde varios servicios, esa normalización deberá proponerse separadamente.

### 6. Reescribir reglas PocketBase con relaciones contextuales

Las reglas conservarán `@request.auth.role = "admin"` solamente donde corresponde al alcance administrativo. Las ramas docentes comprobarán la relación `teachers` del curso del recurso; las ramas estudiantiles comprobarán la matrícula inversa y, cuando corresponda, la autoría de la identidad.

Se retirarán condiciones globales `@request.auth.role = "docente"` o `"estudiante"` cuando la relación contextual ya prueba el permiso. La creación directa de `course_enrollments` permanecerá bloqueada: las Server Actions validarán credencial, modalidad, invitación, identidad y exclusividad antes de usar el cliente de servicio. Las reglas se cubrirán con pruebas de matriz y verificaciones reales con fixtures sintéticos.

### 7. Separar auditoría, migración y verificación

Un comando de auditoría de solo lectura producirá conteos y huellas deterministas de:

- IDs de usuarios y cursos;
- pares curso-docente de `courses.teachers`;
- ID, curso, estudiante e invitación de cada `course_enrollments`;
- intersecciones docente-estudiante por curso;
- relaciones ausentes o duplicadas relevantes.

El reporte excluirá tokens, emails cuando no sean necesarios, claves, contraseñas, HMAC y credenciales. La migración de esquema será idempotente y abortará antes de escribir si la auditoría encuentra conflictos. No eliminará campos, colecciones ni registros. Un respaldo completo recuperable de PocketBase será un prerrequisito operativo distinto del reporte sanitizado.

### 8. Mantener defensa en profundidad y presentación contextual

Ocultar enlaces no reemplazará las comprobaciones del servidor. Cada página directa, Server Action, descarga prefirmada, entrega, evaluación, consulta y solicitud de IA deberá validar sesión y relación con el curso del recurso.

Las etiquetas visibles de “Docente” o “Estudiante” dentro de foros y listados se derivarán del contexto del curso cuando ese contexto esté disponible, no del valor global de compatibilidad. Esto evita identificar como docente en el curso B a una persona que solamente enseña en el curso A.

## Risks / Trade-offs

- [Reglas relacionales más amplias podrían autorizar recursos de otro curso si se compone mal un filtro] → Probar cada colección con docente asignado, docente ajeno, estudiante matriculado, estudiante ajeno, cuenta mixta, administrador y cliente anónimo.
- [Las dos fuentes de participación no ofrecen una única restricción de base de datos entre docente y estudiante] → Confinar escrituras a acciones validadas en ambas direcciones, releer el estado después de mutar y ejecutar auditoría periódica; normalizar membresías en un cambio futuro si aparecen múltiples escritores.
- [Consultas adicionales para resolver espacios pueden aumentar la latencia del shell] → Consultar solamente existencia o conteos mínimos en paralelo y reutilizar los datos ya cargados por las portadas.
- [Código legado puede seguir autorizando por `users.role`] → Inventariar todos los usos, clasificarlos entre privilegio global, presentación y alcance de curso, y bloquear la entrega mientras queden guardas contextuales incorrectas.
- [Cambios OpenSpec paralelos modifican los mismos requisitos] → Consolidar o archivar primero `redesign-role-based-experience` y los cambios de matrícula ya implementados; validar nuevamente este delta contra las especificaciones canónicas resultantes.
- [Un conflicto existente obligaría a decidir qué relación conservar] → Abortar sin escrituras y solicitar una resolución administrativa explícita; nunca elegir por el valor global heredado.
- [Un rollback de reglas podría dejar inaccesible temporalmente un espacio contextual] → Mantener los datos intactos, conservar scripts de reglas anteriores y desplegar reglas antes que la aplicación nueva, de modo que la aplicación anterior siga funcionando durante la transición.

## Migration Plan

1. Consolidar los cambios OpenSpec implementados que modifican navegación y matrícula antes de aplicar este cambio.
2. Crear un respaldo completo y recuperable de PocketBase y registrar su ubicación fuera del repositorio.
3. Ejecutar la auditoría previa en modo lectura; guardar solamente el reporte sanitizado y detener el proceso ante conflictos o relaciones inválidas.
4. Añadir pruebas de reglas y ejecutar la migración idempotente que actualiza exclusivamente reglas y soporte no destructivo. Las relaciones contextuales nuevas amplían capacidades válidas, por lo que la versión anterior de la aplicación continúa funcionando.
5. Desplegar la aplicación con resolución central de capacidades, guardas contextuales, exclusividad de escritura y selector de espacios.
6. Ejecutar la matriz de acceso con fixtures sintéticos y recorridos de interfaz para cuentas con un espacio y con participaciones mixtas.
7. Ejecutar la auditoría posterior y exigir igualdad exacta de IDs y relaciones preexistentes respecto del reporte previo.
8. Ante una regresión, volver a la aplicación y reglas anteriores sin restaurar ni eliminar datos. Usar el respaldo solamente si una verificación demuestra una mutación inesperada de registros.
