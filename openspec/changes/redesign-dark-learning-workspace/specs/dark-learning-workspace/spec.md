## Purpose

Proporcionar una experiencia oscura coherente para completar tareas académicas y administrativas, con navegación comprensible y contenido legible tanto en computadora como en celular.

## ADDED Requirements

### Requirement: Selección táctil de contenidos del curso
Administración MUST poder vincular varios contenidos al curso mediante controles individuales operables por teclado y pantalla táctil, conservando las selecciones guardadas y las reglas de autorización del servidor.

#### Scenario: Vincular varias clases
- **WHEN** un administrador marca dos clases y guarda la configuración
- **THEN** ambas clases se envían como contenido vinculado sin necesitar teclas modificadoras

### Requirement: Navegación contextual por organización del curso
La aplicación MUST ofrecer «Unidades» con un destino existente en cursos organizados por unidades y MUST conservar «Clases» y «Trabajos» en cursos tradicionales. La navegación MUST respetar la matrícula del estudiante y la asignación del docente.

#### Scenario: Curso por unidades
- **WHEN** una persona autorizada abre un curso organizado por unidades o uno de sus contenidos
- **THEN** puede regresar a «Unidades» mediante un enlace al listado real del curso sin anclas inexistentes

#### Scenario: Curso tradicional
- **WHEN** una persona autorizada abre un curso tradicional
- **THEN** dispone de enlaces separados a Clases y Trabajos

### Requirement: Navegación móvil operable
La aplicación MUST ofrecer un menú móvil por teclado con nombre accesible, cierre por Escape y retorno de foco. MUST conservar acceso al perfil, cambio de espacio y destinos autorizados sin reservar una barra inferior para un único enlace.

#### Scenario: Abrir y cerrar menú
- **WHEN** la persona abre el menú móvil y presiona Escape
- **THEN** el menú cierra y el foco vuelve al control que lo abrió

### Requirement: Unidades plegables
Las personas autorizadas MUST poder expandir y plegar unidades mediante teclado y puntero. El título, número, cantidades y estado MUST seguir disponibles al plegarlas. Las acciones de gestión MUST continuar disponibles para docentes.

#### Scenario: Consultar contenido
- **WHEN** un estudiante expande una unidad publicada
- **THEN** accede a sus clases y trabajos autorizados y puede plegarla sin perder la identificación de la unidad

### Requirement: Jerarquía y adaptación transversal
Las pantallas MUST mantener el tema oscuro, texto legible, foco visible y acciones identificables. A 320 CSS px MUST conservarse las tareas esenciales sin desplazamiento horizontal de la página; las tablas pueden disponer de desplazamiento interno. El ingreso MUST conservar una etiqueta accesible durante la autenticación y anunciar errores.

#### Scenario: Tarea en celular
- **WHEN** una persona accede a formularios, recursos o entregas desde un ancho de 320 CSS px
- **THEN** puede identificar y operar las acciones sin que su contenido quede fuera del viewport

### Requirement: Portadas orientadas a tareas
La portada del estudiante MUST destacar su siguiente actividad antes de métricas secundarias. Administración MUST ofrecer accesos explícitos a cursos y participantes. Todas las portadas MUST usar datos vigentes dentro del alcance de la persona autenticada.

#### Scenario: Continuar una actividad
- **WHEN** un estudiante tiene una próxima actividad
- **THEN** encuentra un acceso directo destacado antes del resumen de cantidades
