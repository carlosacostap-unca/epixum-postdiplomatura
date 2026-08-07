# Autenticación y control de acceso

## Purpose
Definir el ingreso con Google, la sesión compartida entre navegador y servidor, la recuperación ante tokens inválidos y la separación de áreas por rol.

## Requirements

### Requirement: Pantalla inicial de acceso
El sistema MUST dirigir a una persona sin sesión válida a `/login` cuando intenta acceder a una ruta protegida, y la página raíz MUST resolver al área correspondiente cuando existe una sesión válida.

#### Scenario: Acceso sin sesión
- **WHEN** una persona sin cookie válida solicita una ruta protegida
- **THEN** el sistema la redirige a `/login`
- **AND** elimina cualquier cookie `pb_auth` inválida que estuviera presente

#### Scenario: Entrada por la raíz
- **WHEN** una persona autenticada solicita `/`
- **THEN** el sistema la redirige al panel de su rol

### Requirement: Autenticación con Google OAuth
El sistema MUST autenticar mediante el proveedor Google configurado en PocketBase y MUST crear el registro de usuario cuando la identidad OAuth todavía no existe.

#### Scenario: Primer ingreso
- **WHEN** una identidad válida de Google ingresa por primera vez
- **THEN** PocketBase crea su usuario
- **AND** el sistema asigna únicamente el rol inicial `estudiante`
- **AND** completa nombre y apellido disponibles en los metadatos OAuth

#### Scenario: Usuario existente
- **WHEN** una identidad de Google ya registrada vuelve a ingresar
- **THEN** el sistema conserva su rol y datos actuales

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
El sistema MUST impedir que un rol acceda a los layouts exclusivos de otro rol.

#### Scenario: Administrador
- **WHEN** un usuario con rol `admin` ingresa
- **THEN** accede a administración de cursos y usuarios

#### Scenario: Docente o estudiante fuera de alcance
- **WHEN** un docente o estudiante solicita un área que no corresponde a su rol
- **THEN** el sistema lo redirige a su punto de entrada autorizado

### Requirement: Cierre de sesión
El sistema MUST eliminar tanto el estado local de PocketBase como la cookie HttpOnly al cerrar sesión.

#### Scenario: Logout completo
- **WHEN** un usuario activa “Cerrar sesión”
- **THEN** se limpian ambas representaciones de la sesión
- **AND** el usuario termina en `/login`
