# Matrícula con email autorizado y contraseña

Esta modalidad agrega una segunda validación a cursos seleccionados sin reemplazar el login con Google. La matrícula activa continúa representada exclusivamente por `course_enrollments`.

## Operación

1. Un administrador configura el curso como `Email autorizado + contraseña`.
2. Un administrador o un docente asignado define la contraseña compartida. Epixum guarda solamente su HMAC y nunca permite recuperar el valor anterior.
3. Un administrador autoriza emails individualmente o pegando una lista separada por líneas, comas o punto y coma. Se normalizan espacios exteriores y mayúsculas, se deduplican y se informan direcciones inválidas.
4. Epixum no envía correos. El equipo comunica por fuera de la plataforma tanto la invitación como la contraseña.
5. Después de iniciar sesión con la cuenta de Google autorizada, el estudiante ve la invitación pendiente e ingresa la contraseña. La coincidencia de email ignora mayúsculas y espacios exteriores; la contraseña sí distingue mayúsculas.

## Estados y seguridad

- `pendiente`: puede activarse mientras el curso mantenga la modalidad y no esté en borrador.
- `activada`: conserva la trazabilidad de la matrícula creada.
- `revocada`: no puede activarse y no elimina matrículas existentes.
- Cinco contraseñas incorrectas para el mismo estudiante y curso dentro de 15 minutos bloquean nuevos intentos durante la ventana restante.
- Los intentos almacenan solamente relaciones y fecha. No contienen contraseña, HMAC ni secreto.
- PocketBase bloquea el alta directa de matrículas. Las Server Actions validan sesión, alcance y credencial, y solamente un cliente de servicio confinado al servidor persiste hashes, matrículas y activaciones.
- Los docentes no pueden consultar los emails autorizados. Sólo el administrador administra invitaciones; un docente asignado puede rotar la contraseña de su curso.

Rotar la contraseña tiene efecto inmediato para invitaciones todavía pendientes. Cambiar un curso a modalidad `clave` oculta y desactiva temporalmente sus invitaciones, pero no borra invitaciones ni matrículas. Al volver a `invitacion_contrasena`, las pendientes reaparecen.

## Migración y verificación

La migración dedicada es idempotente:

```powershell
npm run schema:test
npm run schema:invitation
```

Antes de ejecutarla contra PocketBase remoto se deben respaldar el esquema y los conteos de `courses` y `course_enrollments`. Después se comparan esos conteos y se prueban estos perfiles: administrador, docente asignado, docente ajeno, estudiante invitado y estudiante no invitado.

Los registros temporales de verificación deben tener un prefijo identificable y eliminarse solamente después de comprobar sus IDs exactos. Las matrículas reales y los cursos tradicionales no deben modificarse.

## Rollback

1. Cambiar los cursos afectados a `clave` para detener nuevas activaciones por invitación.
2. Restaurar las reglas anteriores desde el respaldo y desplegar la versión previa de la aplicación.
3. Conservar campos, invitaciones e intentos sin uso. No eliminarlos durante el rollback, para evitar pérdida de trazabilidad.

Los intentos antiguos no afectan el flujo porque todas las consultas usan una ventana de 15 minutos. Si el volumen lo exige, pueden purgarse mediante una tarea administrativa posterior, con respaldo, filtro temporal explícito y verificación previa del conjunto exacto de registros.
