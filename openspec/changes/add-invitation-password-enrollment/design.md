## Context

Epixum autentica exclusivamente con Google OAuth y representa el acceso efectivo mediante `course_enrollments`. El flujo vigente permite que un estudiante autenticado se matricule con una clave HMAC del curso; no existen solicitudes manuales ni servicios de correo. Véase `proposal.md` para la motivación y los specs del cambio para el contrato observable.

La solución cruza el formulario administrativo del curso, el panel docente, el panel estudiantil, acciones de servidor y reglas de PocketBase. Debe aceptar invitaciones para emails cuyos usuarios todavía no existen, impedir enumeraciones y mantener operativos todos los cursos actuales.

## Goals / Non-Goals

**Goals:**

- Mantener `course_enrollments` como única fuente de acceso efectivo al contenido.
- Separar una invitación pendiente de una matrícula activa.
- Aplicar autorización tanto en Server Actions como en reglas de PocketBase.
- Comparar emails de forma canónica y contraseñas de forma sensible a mayúsculas.
- Hacer que migración, activación y cargas masivas sean idempotentes.
- Desplegar y revertir sin borrar cursos, matrículas ni invitaciones.

**Non-Goals:**

- Incorporar autenticación por email y contraseña para la cuenta de Epixum.
- Enviar invitaciones, recordatorios o recuperaciones por correo.
- Permitir solicitudes de acceso iniciadas por estudiantes.
- Dar a docentes acceso a la lista de emails invitados.
- Forzar una nueva validación a estudiantes ya matriculados.
- Importar archivos CSV en la primera entrega; la carga masiva será texto pegado y validado.

## Decisions

### 1. Modalidad explícita y compatible en `courses`

Se agregará `enrollmentMode`, select con `clave` e `invitacion_contrasena`, y `invitationPasswordHash`, texto oculto con el HMAC-SHA256 de la contraseña compartida. Los cursos existentes se inicializarán en `clave`; `enrollmentKeyHash` continuará atendiendo el flujo actual.

Sólo administradores podrán cambiar `enrollmentMode`. Administradores y docentes asignados podrán actualizar la credencial correspondiente. La regla de actualización del curso impedirá que un docente envíe `enrollmentMode`, aunque intente evitar la interfaz.

Se prefieren dos hashes independientes frente a reutilizar `enrollmentKeyHash`: separan las políticas de 6 caracteres y comparación normalizada de la clave actual de las políticas de 8 caracteres y comparación sensible a mayúsculas de la contraseña nueva, y permiten alternar la modalidad sin perder ninguna credencial.

### 2. Invitaciones separadas de las matrículas

Se creará `course_enrollment_invitations` con:

- `course`: relación singular obligatoria y con cascada;
- `emailNormalized`: email canónico obligatorio;
- `status`: `pendiente`, `activada` o `revocada`;
- `activatedStudent`: relación singular opcional a `users`;
- `activatedAt`: fecha opcional;
- índice único `(course, emailNormalized)`.

La invitación no tendrá relación obligatoria con `users`, porque debe existir antes del primer login. `course_enrollments` recibirá una relación opcional `invitation` para acreditar el origen de una matrícula con doble validación y sostener reglas de defensa en profundidad.

Se descarta representar lo pendiente dentro de `course_enrollments`: ese modelo concede acceso hoy y exige una relación con un estudiante existente, por lo que mezclar ambos estados arriesgaría filtraciones de contenido y no admitiría emails preautorizados antes del registro.

### 3. Normalización y reglas de lectura por email

Los emails ingresados se transformarán con `trim().toLowerCase()` antes de validar, deduplicar y persistir. Las reglas estudiantiles compararán `emailNormalized` con el email autenticado usando el modificador minúscula del motor de filtros. La interfaz y las acciones volverán a normalizar para producir resultados estables.

Los administradores podrán listar y mutar invitaciones. Un estudiante sólo podrá listar invitaciones `pendiente` de su propio email cuyo curso esté en `invitacion_contrasena` y no sea borrador. Los docentes no podrán leer la colección; su autorización para cambiar la contraseña se resolverá desde la relación `courses.teachers` sin revelar destinatarios.

Se prefiere esta comparación directa a agregar un segundo email editable en `users`: evita una identidad duplicada que podría desincronizarse o ser manipulada por el usuario.

### 4. Contraseñas verificadas mediante HMAC en el servidor

La contraseña nunca llegará a PocketBase ni a logs. Una Server Action validará longitud, calculará HMAC-SHA256 con el secreto ya empleado para credenciales de matrícula y buscará una coincidencia contra el campo oculto. La comparación conservará mayúsculas, minúsculas y caracteres de la contraseña; no aplicará la normalización de las claves tradicionales.

El hash determinista permite que las Server Actions busquen una coincidencia sin recuperar ni exponer el valor almacenado. PocketBase descarta escrituras regulares sobre campos ocultos, por lo que esos hashes se escriben únicamente con un cliente de servicio exclusivo del servidor después de comprobar rol y alcance. Un hash lento convencional sería preferible para contraseñas de usuario, pero impediría la búsqueda determinista; el secreto HMAC, la longitud mínima y el límite de intentos compensan el carácter compartido de esta credencial.

La acción que rota la contraseña comprobará `admin` o pertenencia a `course.teachers`, actualizará únicamente `invitationPasswordHash`, saneará errores y revalidará paneles. No se conservará ni mostrará la contraseña anterior.

### 5. Activación idempotente y defensa en profundidad

La activación seguirá este orden:

1. validar sesión, rol `estudiante`, identidad y formato;
2. obtener una invitación propia `pendiente` y su curso habilitado;
3. comprobar el bloqueo antes de evaluar la contraseña;
4. comparar el HMAC contra `invitationPasswordHash`;
5. si falla, registrar el intento sin persistir valores de contraseña;
6. si coincide, usar el cliente de servicio para crear `course_enrollments` con `student`, `course`, `invitation` y la prueba HMAC;
7. usar el mismo cliente de servicio para marcar la invitación `activada` con estudiante y fecha;
8. revalidar “Mis cursos” y devolver un destino al curso.

El índice único de matrículas resuelve activaciones concurrentes. La regla de creación queda bloqueada para clientes regulares; la Server Action verifica identidad, modalidad, curso no borrador, invitación pendiente del mismo email y prueba HMAC antes de delegar la escritura al cliente de servicio. Así, incluso un cliente que conozca la credencial no puede fabricar una matrícula llamando directamente a PocketBase.

La matrícula será la fuente de verdad del acceso. Si la matrícula se crea y la actualización posterior de la invitación falla, un nuevo intento detectará la matrícula existente y reconciliará la invitación; no se retirará el acceso ya concedido ni se duplicará el registro.

### 6. Intentos fallidos como registros inmutables

Se creará `course_enrollment_attempts` con relaciones a curso, invitación y estudiante, más la fecha automática de creación. Sólo se registrarán fallos; nunca la contraseña, su HMAC ni un fragmento. Tendrá índices para consultar `(student, course, created)` y cascada desde curso o invitación.

La Server Action contará los intentos de los últimos 15 minutos antes de verificar. Cinco registros vigentes bloquean la evaluación. Una activación correcta termina el flujo; al vencer la ventana, los registros anteriores dejan de contar y comienza un ciclo nuevo.

Se prefieren eventos inmutables frente a contadores editables en la invitación porque permitir una actualización estudiantil del contador abriría una vía para reiniciarlo mediante la API. El usuario podrá crear solamente intentos ligados a sí mismo y a su invitación, pero no modificarlos ni borrarlos; generar fallos adicionales sólo puede bloquear su propia activación.

Los eventos antiguos no participan en consultas gracias al filtro temporal y al índice. Una tarea de mantenimiento autenticada podrá purgar intentos antiguos si el volumen operativo lo requiere, sin formar parte del camino crítico de activación.

### 7. Gestión masiva idempotente

El administrador dispondrá de una entrada individual y otra de texto masivo. El parser aceptará líneas, comas y punto y coma, normalizará y deduplicará localmente, y mostrará una previsualización de válidos, inválidos y repetidos. Al confirmar, una Server Action volverá a validar el rol, el curso y cada email.

El índice único permitirá continuar si dos administradores cargan la misma dirección a la vez. La respuesta agregará creadas, existentes e inválidas sin convertir un duplicado en un error general. Una invitación revocada seguirá siendo el mismo registro y no se reactivará silenciosamente; requerirá una acción administrativa explícita posterior si esa capacidad se incorpora.

### 8. Estados, cambios de modalidad y visibilidad

Las invitaciones no tendrán vencimiento automático. Sólo `pendiente` será activable; `activada` conservará trazabilidad y `revocada` impedirá el acceso futuro. Revocar una invitación pendiente no toca matrículas. Una matrícula ya creada se administra como matrícula y no pierde acceso por rotar la contraseña o cambiar el modo.

Al pasar a `clave`, las invitaciones permanecen guardadas pero desaparecen del panel estudiantil y la acción rechaza activarlas. Al volver a `invitacion_contrasena`, las pendientes reaparecen. El formulario general “Sumarme a un curso” filtrará sólo cursos en modalidad `clave` para no revelar cursos restringidos.

## Risks / Trade-offs

- **[Contraseña compartida divulgada]** → La invitación por email sigue siendo obligatoria; rotación, HMAC oculto y bloqueo reducen el impacto.
- **[Ráfaga de solicitudes concurrentes supera momentáneamente el umbral]** → Las reglas bloquean toda creación directa de matrículas, los intentos son inmutables y los índices únicos evitan duplicados; se añadirán pruebas de concurrencia razonables.
- **[Crecimiento del historial de intentos]** → Índice temporal, consultas acotadas y tarea de purga administrativa opcional.
- **[Estado `activada` desincronizado después de un fallo parcial]** → `course_enrollments` permanece como fuente de verdad y la activación repetida reconcilia el estado.
- **[Cambio de email de Google]** → La invitación permanece asociada al email originalmente autorizado; un administrador deberá revocarla y crear otra para la nueva identidad.
- **[Cambio de modalidad confuso]** → La UI explicará que no elimina matrículas ni invitaciones y mostrará solamente los controles correspondientes al modo activo.
- **[Datos sensibles en errores o telemetría]** → Mensajes sanitizados y prohibición explícita de registrar contraseña, HMAC o secreto.

## Migration Plan

1. Crear y probar localmente una migración idempotente que agregue campos, colecciones, índices y reglas sin eliminar datos.
2. Respaldar el esquema remoto y verificar conteos de cursos y matrículas antes de aplicar cambios.
3. Agregar `enrollmentMode` e `invitationPasswordHash`; inicializar únicamente cursos sin modo como `clave`.
4. Crear invitaciones e intentos y agregar la relación opcional desde matrículas.
5. Actualizar reglas de cursos y matrículas, conservando el flujo tradicional.
6. Ejecutar pruebas reales de acceso para administrador, docente asignado, docente ajeno, estudiante invitado y estudiante no invitado.
7. Desplegar la aplicación, verificar activación completa y supervisar errores sanitizados.

Para revertir, se configurarán los cursos afectados en `clave`, se restaurarán las reglas anteriores y se desplegará la versión previa. Las nuevas colecciones y campos permanecerán sin uso para evitar pérdida de invitaciones o auditoría; podrán retirarse sólo mediante una operación posterior, explícita y respaldada.
