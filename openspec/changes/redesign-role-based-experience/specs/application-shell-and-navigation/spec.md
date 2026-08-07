## MODIFIED Requirements

### Requirement: Navegación específica por rol
Cada panel MUST ofrecer una estructura común y únicamente los accesos relevantes para su rol, MUST señalar la ubicación activa y MUST mantener accesibles el perfil y el cierre de sesión.

#### Scenario: Estudiante
- **WHEN** un estudiante navega por la aplicación
- **THEN** dispone de inicio, Mis cursos, perfil y cierre de sesión
- **AND** su portada prioriza continuar aprendiendo, próximos vencimientos y matrícula

#### Scenario: Docente
- **WHEN** un docente navega por su panel
- **THEN** dispone de inicio, cursos, clases, perfil y cierre de sesión
- **AND** su portada prioriza entregas por revisar, consultas pendientes y gestión de contenido

#### Scenario: Administrador
- **WHEN** un administrador navega por su panel
- **THEN** dispone de inicio, cursos, usuarios, perfil y cierre de sesión
- **AND** su portada resume el estado operativo de la plataforma

#### Scenario: Ubicación activa
- **WHEN** el usuario cambia de sección
- **THEN** la navegación identifica visual y semánticamente el destino actual

### Requirement: Interfaz responsive
Los layouts MUST conservar navegación, contexto y acciones esenciales en escritorio y dispositivos móviles, adaptando densidad y presentación sin eliminar capacidades.

#### Scenario: Pantalla móvil
- **WHEN** el ancho no permite la navegación horizontal completa
- **THEN** el shell ofrece una navegación móvil equivalente y deja visible la acción principal del contexto

#### Scenario: Datos tabulares en móvil
- **WHEN** una lista administrativa no cabe como tabla
- **THEN** se presenta como tarjetas o filas responsivas con las mismas acciones y datos esenciales

### Requirement: Estados de interfaz
Las operaciones asíncronas MUST comunicar carga, éxito, ausencia de datos y error sin requerir recargar manualmente la página, usando patrones coherentes y accesibles.

#### Scenario: Operación en curso
- **WHEN** el usuario envía un formulario o archivo
- **THEN** el control evita envíos repetidos y muestra un estado de progreso con una etiqueta comprensible

#### Scenario: Operación completada
- **WHEN** una acción modifica datos correctamente
- **THEN** las rutas afectadas se revalidan y la vista refleja el nuevo estado
- **AND** el resultado se anuncia sin cambiar inesperadamente el contexto

#### Scenario: Error recuperable
- **WHEN** una operación falla sin invalidar la sesión
- **THEN** la interfaz explica qué ocurrió y ofrece reintentar o corregir los datos

## ADDED Requirements

### Requirement: Navegación contextual de curso
Las áreas de un curso MUST ofrecer un contexto persistente con nombre del curso, ubicación jerárquica y accesos a las secciones permitidas para el rol.

#### Scenario: Cambio entre secciones de un curso
- **WHEN** un docente o estudiante abre clases, trabajos o consultas
- **THEN** puede volver al curso y cambiar de sección sin reconstruir la ruta mentalmente

#### Scenario: Acción contextual
- **WHEN** un docente se encuentra en una sección gestionable
- **THEN** la acción primaria correspondiente se presenta junto al encabezado de esa sección

### Requirement: Portadas orientadas a tareas
La portada de cada rol MUST presentar primero información accionable y MUST evitar métricas decorativas que no conduzcan a una decisión.

#### Scenario: Sin pendientes
- **WHEN** el usuario no tiene acciones urgentes
- **THEN** la portada comunica el estado al día y ofrece el siguiente destino útil

#### Scenario: Con pendientes
- **WHEN** existen elementos que requieren atención
- **THEN** la portada los ordena por urgencia y permite abrir directamente su contexto
