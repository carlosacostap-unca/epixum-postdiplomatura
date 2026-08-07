## 1. Modelo de dominio y validación

- [x] 1.1 Extender los tipos de curso con `enrollmentMode` e `invitationPasswordHash` y definir tipos de invitación, estado, intento y relaciones expandidas.
- [x] 1.2 Implementar normalización y validación de emails individuales y listas separadas por líneas, comas o punto y coma.
- [x] 1.3 Implementar validación de contraseña compartida de 8 a 64 caracteres, sensible a mayúsculas, y generación HMAC sin registrar valores sensibles.
- [x] 1.4 Añadir pruebas unitarias para normalización, deduplicación, emails inválidos, límites de contraseña y diferencias de mayúsculas.

## 2. Migración y reglas de PocketBase

- [x] 2.1 Agregar de forma idempotente a `courses` los campos `enrollmentMode` e `invitationPasswordHash`, inicializando solamente cursos sin modo como `clave`.
- [x] 2.2 Crear `course_enrollment_invitations` con relaciones, estados, fecha de activación e índice único por curso y email normalizado.
- [x] 2.3 Crear `course_enrollment_attempts` con relaciones, cascadas e índice temporal por estudiante y curso, sin campos para contraseña o HMAC.
- [x] 2.4 Agregar a `course_enrollments` la relación opcional de invitación, bloquear su creación directa y reservar el alta validada al cliente de servicio del servidor.
- [x] 2.5 Restringir las reglas de invitaciones a administración exclusiva por admin y lectura estudiantil de invitaciones propias mediante comparación minúscula del email autenticado.
- [x] 2.6 Restringir intentos para que el estudiante sólo pueda crear registros propios válidamente relacionados y no pueda modificarlos ni eliminarlos.
- [x] 2.7 Ajustar la regla de cursos para permitir rotación de contraseña a admin y docente asignado sin permitir que el docente cambie `enrollmentMode`.
- [x] 2.8 Actualizar el esquema documental y las pruebas de migración para primera ejecución, reejecución, índices únicos y conservación de cursos, claves y matrículas.

## 3. Configuración administrativa del curso

- [x] 3.1 Incorporar la selección `clave` o `invitacion_contrasena` en creación y edición de cursos, visible y modificable solamente por administradores.
- [x] 3.2 Actualizar las acciones de curso para validar la modalidad, conservar las dos credenciales al alternar y revalidar las vistas afectadas.
- [x] 3.3 Explicar en el formulario que cambiar la modalidad no elimina matrículas ni invitaciones y que la comunicación ocurre fuera de Epixum.
- [x] 3.4 Añadir pruebas de acción y UI para creación, cambio de modalidad, compatibilidad con cursos existentes y rechazo de cambios docentes.

## 4. Gestión de la contraseña compartida

- [x] 4.1 Implementar una Server Action que permita rotar `invitationPasswordHash` solamente a administradores o docentes asignados.
- [x] 4.2 Adaptar el gestor de credenciales del curso para mostrar clave tradicional o contraseña compartida según la modalidad, sin recuperar hashes ni valores anteriores.
- [x] 4.3 Integrar el gestor en las vistas administrativas y docentes respetando el alcance del curso.
- [x] 4.4 Probar contraseña válida e inválida, sensibilidad a mayúsculas, rotación inmediata, admin global, docente asignado y docente ajeno.

## 5. Administración de invitaciones

- [x] 5.1 Implementar consultas administrativas paginadas por curso y estado sin exponer invitaciones a docentes ni estudiantes.
- [x] 5.2 Implementar acciones exclusivas de admin para crear una invitación individual, cargar una lista masiva y revocar una invitación pendiente.
- [x] 5.3 Hacer que la carga masiva devuelva resúmenes separados de creadas, existentes, revocadas e inválidas y tolere duplicados concurrentes.
- [x] 5.4 Crear la interfaz administrativa con entrada individual, previsualización masiva, confirmación, filtros por estado y acciones accesibles de revocación.
- [x] 5.5 Añadir pruebas de carga individual y masiva, normalización, unicidad, permisos, revocación y ausencia de cualquier envío de email.

## 6. Activación y bloqueo de seguridad

- [x] 6.1 Implementar la consulta estudiantil de invitaciones pendientes propias, filtrando curso no borrador y modalidad activa sin revelar otros emails.
- [x] 6.2 Implementar el cálculo del bloqueo mediante intentos fallidos de los últimos 15 minutos para el mismo estudiante y curso.
- [x] 6.3 Implementar la Server Action de activación que valide sesión, identidad, invitación, modalidad, bloqueo y HMAC antes de crear la matrícula.
- [x] 6.4 Registrar únicamente intentos incorrectos, bloquear desde el quinto durante 15 minutos y evitar comprobar la contraseña mientras dure el bloqueo.
- [x] 6.5 Crear la matrícula con prueba e invitación, marcarla activada y reconciliar idempotentemente fallos parciales o activaciones repetidas.
- [x] 6.6 Mantener la matrícula por clave limitada a cursos `clave` y devolver errores genéricos para cursos restringidos.
- [x] 6.7 Añadir pruebas unitarias y de acciones para contraseña correcta e incorrecta, quinto intento, vencimiento, identidad ajena, curso borrador, cambio de modalidad, repetición y concurrencia.

## 7. Experiencia del estudiante

- [x] 7.1 Mostrar en el panel una sección separada de invitaciones pendientes después del login, sin incorporarlas todavía a “Mis cursos”.
- [x] 7.2 Crear tarjetas y diálogo accesible para ingresar la contraseña, comunicar intentos restantes o bloqueo y conservar el contexto ante errores.
- [x] 7.3 Actualizar inmediatamente “Mis cursos” y ofrecer acceso directo después de una activación exitosa.
- [x] 7.4 Ocultar invitaciones pendientes cuando el curso pase a `clave` y volver a mostrarlas si retorna a `invitacion_contrasena`.
- [x] 7.5 Añadir pruebas de interfaz para cero, una y varias invitaciones, navegación por teclado, errores, bloqueo y activación exitosa.

## 8. Seguridad e integración real

- [x] 8.1 Ampliar las pruebas de reglas con admin, docente asignado, docente ajeno, estudiante invitado y estudiante no invitado intentando lecturas y mutaciones directas.
- [x] 8.2 Verificar que una llamada directa no pueda crear matrículas aun enviando una prueba, usar una invitación ajena, cambiar el email invitado ni borrar intentos.
- [x] 8.3 Verificar que hashes, contraseñas y secreto no se serialicen, registren ni aparezcan en mensajes de error.
- [x] 8.4 Probar que rotación, cambio de modalidad y migración conservan matrículas activas y que las reglas semanales continúan reconociéndolas.
- [x] 8.5 Documentar operación, carga masiva, comunicación externa, rotación, estados, rollback y mantenimiento opcional de intentos antiguos.

## 9. Validación y despliegue

- [x] 9.1 Ejecutar pruebas unitarias, de componentes, Server Actions, esquema e integración y corregir regresiones.
- [x] 9.2 Ejecutar ESLint, TypeScript, build de producción y validación estricta de OpenSpec.
- [x] 9.3 Respaldar y comparar conteos del PocketBase remoto antes de aplicar la migración con autorización explícita.
- [x] 9.4 Aplicar la migración remota idempotente y ejecutar pruebas reales de acceso y activación con datos temporales recuperables.
- [x] 9.5 Confirmar que no cambió el acceso de cursos tradicionales ni matrículas existentes y registrar el resultado final de despliegue y rollback disponible.
