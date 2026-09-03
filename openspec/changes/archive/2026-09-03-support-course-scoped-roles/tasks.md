## 1. Preparación y compatibilidad

- [x] 1.1 Consolidar los cambios OpenSpec implementados que modifican navegación y matrícula, y revalidar estos deltas contra las especificaciones canónicas resultantes.
- [x] 1.2 Inventariar todos los usos de `users.role` en páginas, layouts, Server Actions, helpers, componentes, pruebas y reglas PocketBase, clasificando cada uso como privilegio global, alcance docente, alcance estudiantil o presentación.
- [x] 1.3 Implementar la auditoría de solo lectura con conteos y huellas deterministas de usuarios, cursos, pares curso-docente y matrículas, incluida la detección de conflictos y relaciones inválidas, sin registrar datos sensibles.
- [x] 1.4 Añadir pruebas automatizadas que demuestren que la auditoría es idempotente, falla ante una intersección docente-estudiante y produce resultados comparables antes y después.
- [x] 1.5 Documentar el requisito de respaldo completo recuperable, el reporte sanitizado, los criterios de aborto y el rollback sin eliminación de datos.

## 2. Resolución central de capacidades

- [x] 2.1 Leer la documentación local de Next.js 16 aplicable a cookies, redirecciones, Server Components y caché antes de modificar esos flujos.
- [x] 2.2 Implementar un modelo central que resuelva privilegio administrativo, espacios disponibles, asignación docente por curso y matrícula estudiantil por curso desde la sesión y las relaciones vigentes.
- [x] 2.3 Consolidar los helpers de alcance docente y estudiantil para que reciban o resuelvan el curso del recurso y no autoricen por valores globales `docente` o `estudiante`.
- [x] 2.4 Añadir pruebas unitarias para administrador, docente asignado, docente ajeno, estudiante matriculado, estudiante ajeno y una misma cuenta docente en A y estudiante en B.

## 3. Acceso, sesión y navegación

- [x] 3.1 Adaptar el retorno de OAuth y la ruta raíz para elegir un espacio inicial autorizado sin ocultar los demás espacios disponibles.
- [x] 3.2 Actualizar los layouts de administración, docencia y estudio para validar capacidades de espacio y evitar ciclos de redirección en cuentas con participaciones mixtas o sin cursos.
- [x] 3.3 Derivar la navegación activa desde la ruta y adaptar el shell para recibir todos los espacios autorizados en vez de seleccionar una única configuración por `users.role`.
- [x] 3.4 Implementar un selector accesible de espacios para cuentas con más de uno y ocultarlo cuando exista un único espacio disponible.
- [x] 3.5 Actualizar las etiquetas de rol en foros, entregas y vistas de curso para derivarlas del curso correspondiente cuando exista contexto.
- [x] 3.6 Añadir pruebas de login, raíz, layouts, navegación de escritorio y móvil, foco y URLs directas para cuentas con uno y varios espacios.

## 4. Matrícula y asignación docente

- [x] 4.1 Permitir matrícula por clave a cualquier identidad autenticada, manteniendo validaciones de modalidad, credencial, estado, unicidad e identidad y rechazando docentes del mismo curso antes de usar el cliente de servicio.
- [x] 4.2 Aplicar la misma exclusividad a la activación por invitación y conservar intacta la invitación cuando la identidad ya enseña en ese curso.
- [x] 4.3 Permitir seleccionar como docente a cualquier cuenta no matriculada en el curso, sin filtrar candidatos por el valor global `docente`.
- [x] 4.4 Validar en el servidor la lista docente completa antes de crear o actualizar un curso y rechazarla sin cambios parciales cuando intersecte matrículas del mismo curso.
- [x] 4.5 Releer y verificar la participación después de cada mutación autorizada, devolviendo mensajes específicos sin eliminar la relación opuesta.
- [x] 4.6 Añadir pruebas de ambas direcciones del conflicto, matrícula repetida, invitación, asignación en otro curso y conservación de participaciones previas.

## 5. Autorización contextual en funcionalidades de curso

- [x] 5.1 Sustituir guardas globales en clases, semanas, contenidos y recursos por comprobaciones de asignación docente, matrícula o administración sobre el curso del recurso.
- [x] 5.2 Sustituir guardas globales en trabajos, entregas, descargas, evaluación y preevaluación con IA por comprobaciones contextuales sobre el curso del trabajo.
- [x] 5.3 Sustituir guardas globales en consultas y respuestas por matrícula, asignación docente, autoría o administración según cada operación y el mismo curso.
- [x] 5.4 Revisar acciones y páginas genéricas que construyen destinos desde `users.role` para que resuelvan el espacio válido según el recurso y la participación.
- [x] 5.5 Añadir pruebas negativas de acceso cruzado que demuestren que enseñar o estudiar en el curso A no concede permisos sobre el curso B.

## 6. Administración de usuarios y participaciones

- [x] 6.1 Reemplazar el selector global docente-estudiante por una gestión explícita del privilegio administrativo que conserve asignaciones y matrículas al concederlo o retirarlo.
- [x] 6.2 Mostrar en la administración de usuarios las participaciones docentes y estudiantiles con sus cursos correspondientes.
- [x] 6.3 Adaptar búsqueda, filtros, conteos y presentación móvil para distinguir privilegio administrativo, docencia y estudio derivados de sus fuentes reales.
- [x] 6.4 Añadir pruebas de escalada rechazada, cambio administrativo autorizado, conservación de participaciones y visualización de una cuenta mixta.

## 7. Reglas y migración PocketBase

- [x] 7.1 Actualizar las definiciones versionadas de reglas para cursos, matrículas, invitaciones, semanas, clases, contenidos, recursos, trabajos, entregas, consultas y preevaluación, manteniendo `admin` global y usando relaciones del mismo curso para docencia y estudio.
- [x] 7.2 Mantener bloqueada la creación directa de matrículas y verificar que únicamente las acciones de servidor validadas utilicen el cliente de servicio.
- [x] 7.3 Implementar una migración idempotente que ejecute primero la auditoría y actualice solamente reglas o soporte no destructivo, sin eliminar ni recrear registros, campos o colecciones.
- [x] 7.4 Añadir pruebas estáticas de todas las reglas para impedir que reaparezcan dependencias globales `docente` o `estudiante` donde corresponde una relación contextual.
- [x] 7.5 Ampliar el verificador real con fixtures sintéticos para administrador, docente asignado, docente ajeno, estudiante matriculado, estudiante ajeno, cuenta mixta y cliente anónimo, garantizando limpieza completa.

## 8. Verificación y despliegue seguro

- [x] 8.1 Ejecutar pruebas unitarias, de componentes, de esquema y de integración relevantes, además de lint y build, y corregir cualquier regresión.
- [x] 8.2 Ejecutar la auditoría previa sobre PocketBase remoto en modo lectura y revisar manualmente cualquier conflicto antes de autorizar escrituras.
- [x] 8.3 Confirmar un respaldo completo recuperable y aplicar primero la migración idempotente de reglas, conservando evidencia sanitizada de la ejecución.
- [x] 8.4 Desplegar la aplicación y ejecutar recorridos reales de administración, docencia, estudio, matrícula y cambio de espacio con datos sintéticos.
- [x] 8.5 Ejecutar la auditoría posterior y exigir igualdad exacta de IDs, asignaciones docentes y matrículas preexistentes respecto del reporte previo.
- [x] 8.6 Documentar resultados, conteos, rollback disponible y cualquier limitación residual sin incluir credenciales ni información personal.
