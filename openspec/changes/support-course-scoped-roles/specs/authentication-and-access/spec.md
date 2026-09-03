## MODIFIED Requirements

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
