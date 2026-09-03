## ADDED Requirements

### Requirement: Resumen administrativo de participaciones
La administración de usuarios MUST mostrar por separado el privilegio global y las participaciones docentes o estudiantiles derivadas de cursos, sin presentar estas últimas como una única selección excluyente.

#### Scenario: Persona con participaciones mixtas
- **WHEN** un administrador consulta una persona que enseña en un curso y estudia en otro
- **THEN** la interfaz muestra ambas participaciones con sus cursos correspondientes
- **AND** no propone convertir globalmente la cuenta entre docente y estudiante

#### Scenario: Búsqueda por participación
- **WHEN** un administrador filtra personas por docencia o estudio
- **THEN** los resultados se calculan desde `courses.teachers` o `course_enrollments` respectivamente

## MODIFIED Requirements

### Requirement: Gestión administrativa de roles
Solo un administrador MUST poder conceder o retirar el privilegio global de administración, y la interfaz MUST permitir localizar usuarios y confirmar el cambio con contexto suficiente; la docencia y el estudio MUST administrarse como participaciones por curso.

#### Scenario: Búsqueda y filtrado
- **WHEN** un administrador busca por nombre o correo, o filtra por privilegio global o participación contextual
- **THEN** la lista muestra usuarios coincidentes y la cantidad de resultados

#### Scenario: Cambio de privilegio administrativo
- **WHEN** un administrador concede o retira el privilegio global de una persona identificada
- **THEN** PocketBase actualiza la cuenta
- **AND** la lista administrativa comunica y refleja el nuevo privilegio
- **AND** conserva sus asignaciones docentes y matrículas

#### Scenario: Gestión de docencia o estudio
- **WHEN** un administrador necesita cambiar la participación docente o estudiantil de una persona
- **THEN** realiza el cambio dentro del curso correspondiente
- **AND** no reemplaza un rol global de toda la cuenta

#### Scenario: Escalada de privilegios
- **WHEN** una persona sin privilegio administrativo intenta concederse `admin`
- **THEN** las acciones del servidor y las reglas de PocketBase rechazan el cambio
