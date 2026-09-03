# Autenticación y control de acceso

## Purpose
Definir el ingreso con Google, la sesión compartida entre navegador y servidor, la recuperación ante tokens inválidos y la separación de áreas por rol.

## Requirements

### Requirement: Pantalla inicial de acceso
El sistema MUST dirigir a una persona sin sesión válida a `/login` cuando intenta acceder a una ruta protegida, y la página raíz MUST resolver un espacio autorizado sin ocultar los demás espacios disponibles para la misma cuenta.

#### Scenario: Acceso sin sesión
- **WHEN** una persona sin cookie válida solicita una ruta protegida
- **THEN** el sistema la redirige a `/login`
- **AND** elimina cualquier cookie `pb_auth` inválida que estuviera presente

#### Scenario: Entrada con un único espacio
- **WHEN** una persona autenticada solicita `/` y posee un único espacio autorizado
- **THEN** el sistema la redirige al inicio de ese espacio

#### Scenario: Entrada con varios espacios
- **WHEN** una persona autenticada solicita `/` y puede administrar, enseñar o estudiar en más de un espacio
- **THEN** el sistema abre un espacio autorizado y ofrece acceso visible a los demás sin requerir otro inicio de sesión

### Requirement: Autenticación con Google OAuth
El sistema MUST autenticar mediante el proveedor Google configurado en PocketBase, MUST crear el registro de usuario cuando la identidad OAuth todavía no existe y MUST impedir que el valor inicial de compatibilidad limite futuras participaciones por curso.

#### Scenario: Primer ingreso
- **WHEN** una identidad válida de Google ingresa por primera vez
- **THEN** PocketBase crea su usuario
- **AND** el sistema asigna `estudiante` como valor inicial compatible sin otorgar privilegio administrativo
- **AND** permite que posteriormente sea asignado como docente de un curso sin perder la capacidad de matricularse en otros
- **AND** completa nombre y apellido disponibles en los metadatos OAuth

#### Scenario: Usuario existente
- **WHEN** una identidad de Google ya registrada vuelve a ingresar
- **THEN** el sistema conserva su registro, privilegio global y participaciones actuales

### Requirement: Orientación para ingresar con correos no-Gmail
La pantalla pública de acceso MUST informar que una dirección Hotmail, Yahoo o de otro proveedor puede utilizarse con “Continuar con Google” cuando está asociada a una Cuenta de Google, y MUST orientar a la persona sin incorporar un mecanismo de autenticación alternativo.

#### Scenario: Persona invitada con correo no-Gmail
- **WHEN** una persona abre `/login` antes de autenticarse
- **THEN** ve que no necesita cambiar su dirección invitada por una dirección `@gmail.com`
- **AND** puede acceder a una guía oficial para crear una Cuenta de Google con su correo existente

#### Scenario: Selección de la identidad invitada
- **WHEN** una persona posee varias Cuentas de Google o utiliza un correo alternativo
- **THEN** la pantalla le indica que debe elegir exactamente la cuenta cuyo email fue autorizado

#### Scenario: Invitación ausente después del ingreso
- **WHEN** la persona completa el ingreso pero no encuentra su invitación
- **THEN** la orientación le indica contactar a la administración para revisar el email autorizado

#### Scenario: Compatibilidad del acceso existente
- **WHEN** una persona utiliza una dirección Gmail o una Cuenta de Google ya configurada
- **THEN** mantiene el mismo flujo de Google OAuth sin pasos obligatorios adicionales

### Requirement: Sesión validada del lado del servidor
El sistema MUST validar el JWT de PocketBase antes de crear la cookie HttpOnly y MUST refrescar la identidad en las solicitudes de servidor.

#### Scenario: Token válido
- **WHEN** OAuth devuelve un token válido
- **THEN** el servidor lo refresca contra la colección `users`
- **AND** guarda `pb_auth` como cookie HttpOnly, SameSite Lax y segura en producción

#### Scenario: Token revocado, vencido o malformado
- **WHEN** el token no puede validarse
- **THEN** el sistema limpia el estado del servidor y del navegador
- **AND** muestra nuevamente el login sin producir un ciclo de redirecciones

### Requirement: Separación de rutas por rol
El sistema MUST proteger cada área según el privilegio global o las relaciones contextuales de la cuenta y MUST validar el alcance del curso solicitado además de mostrar u ocultar navegación.

#### Scenario: Área administrativa
- **WHEN** una persona sin privilegio `admin` solicita una ruta administrativa
- **THEN** el sistema la redirige a un espacio autorizado

#### Scenario: Área docente
- **WHEN** una persona asignada como docente al menos a un curso abre el área de docencia
- **THEN** accede al panel docente y ve solamente los cursos donde está incluida en `teachers`

#### Scenario: Área de estudio
- **WHEN** una persona autenticada abre el área de estudio
- **THEN** puede consultar sus matrículas o iniciar un flujo válido para sumarse a un curso
- **AND** solamente puede abrir contenido de cursos donde posee matrícula

#### Scenario: Cuenta con docencia y estudio
- **WHEN** una persona enseña en un curso y está matriculada en otro
- **THEN** puede acceder a ambas áreas durante la misma sesión

### Requirement: Cierre de sesión
El sistema MUST eliminar tanto el estado local de PocketBase como la cookie HttpOnly al cerrar sesión.

#### Scenario: Logout completo
- **WHEN** un usuario activa “Cerrar sesión”
- **THEN** se limpian ambas representaciones de la sesión
- **AND** el usuario termina en `/login`
