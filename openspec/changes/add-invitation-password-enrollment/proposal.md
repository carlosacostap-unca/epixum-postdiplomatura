## Why

Algunos cursos necesitan restringir la matrícula a personas previamente autorizadas sin abandonar el ingreso mediante Google. Epixum debe ofrecer por curso una alternativa al flujo abierto por clave que combine el email verificado del usuario con una contraseña compartida, manteniendo intactos los cursos y las matrículas actuales.

## What Changes

- Incorporar una modalidad de matrícula configurable por administradores: clave abierta actual o invitación por email más contraseña.
- Permitir a administradores cargar emails autorizados de forma individual y masiva, consultar su estado y revocar invitaciones sin enviar correos.
- Mostrar automáticamente al estudiante autenticado las invitaciones pendientes que coincidan con su email verificado de Google.
- Activar la matrícula únicamente después de validar tanto el email invitado como la contraseña compartida del curso.
- Permitir que administradores y docentes asignados creen y roten la contraseña; la rotación afectará invitaciones pendientes, no matrículas activas.
- Limitar a cinco los intentos incorrectos consecutivos y bloquear nuevos intentos durante 15 minutos por estudiante y curso.
- Conservar matrículas existentes al cambiar la modalidad y conservar invitaciones inactivas si el curso vuelve temporalmente al flujo tradicional.
- Mantener la ausencia de envío de emails y el flujo actual por clave para los cursos que no habiliten la doble validación.

## Capabilities

### New Capabilities

- `invitation-password-enrollment`: Invitaciones por email, activación mediante contraseña compartida, estados, bloqueo temporal y experiencia del estudiante.

### Modified Capabilities

- `course-management-and-enrollment`: Agregar la selección administrativa de modalidad, la administración autorizada de la contraseña y la convivencia con la matrícula inmediata por clave.
- `pocketbase-data-and-security`: Incorporar campos, colecciones, índices y reglas que protejan invitaciones, contraseñas, intentos y matrículas activadas.

## Impact

- Interfaz administrativa de creación y edición de cursos y nueva gestión de invitaciones individuales y masivas.
- Panel docente del curso para administrar la contraseña dentro de su alcance.
- Panel del estudiante para detectar y activar invitaciones pendientes después del login.
- Acciones de servidor de cursos y matrículas, consultas de datos, tipos y validadores.
- Esquema y reglas de PocketBase para modalidad, hash de contraseña, invitaciones e intentos fallidos.
- Migración compatible: los cursos actuales permanecen en modalidad por clave, las matrículas actuales siguen vigentes y no se eliminan registros.
- No se incorporan proveedores, plantillas ni procesos de correo electrónico.
