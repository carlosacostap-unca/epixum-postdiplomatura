## Purpose

Definir una experiencia visual Epixum coherente, responsive y accesible que permita operar todas las funciones del producto con independencia del rol o dispositivo.

## ADDED Requirements

### Requirement: Lenguaje visual compartido
La aplicación MUST representar acciones, superficies, tipografía, espaciado, color, iconografía y estados mediante patrones visuales compartidos en todas las áreas autenticadas.

#### Scenario: Misma intención en roles diferentes
- **WHEN** una acción equivalente aparece en las áreas de administración, docencia y estudio
- **THEN** conserva jerarquía, etiqueta, icono, tamaño y comportamiento equivalentes

#### Scenario: Jerarquía de acciones
- **WHEN** una pantalla ofrece varias acciones
- **THEN** identifica como máximo una acción primaria por contexto
- **AND** diferencia de manera consistente acciones secundarias, sutiles y destructivas

### Requirement: Accesibilidad perceptible y operable
La interfaz MUST cumplir contraste WCAG 2.2 nivel AA, MUST exponer nombres y relaciones semánticas, y MUST ser operable con teclado sin depender exclusivamente de color, posición o puntero.

#### Scenario: Navegación con teclado
- **WHEN** una persona recorre una pantalla mediante teclado
- **THEN** el foco permanece visible y sigue un orden lógico
- **AND** todos los controles interactivos pueden activarse sin mouse

#### Scenario: Comunicación de estado
- **WHEN** la interfaz comunica error, éxito, selección o vencimiento
- **THEN** combina texto o iconografía accesible con el tratamiento cromático
- **AND** los cambios relevantes se anuncian mediante regiones de estado apropiadas

#### Scenario: Zoom y tamaño reducido
- **WHEN** la interfaz se usa a 320 píxeles de ancho o con zoom del 200 por ciento
- **THEN** el contenido esencial permanece disponible sin desplazamiento horizontal de página

### Requirement: Preferencias y movimiento
Las transiciones MUST ser breves y funcionales, y la aplicación MUST respetar la preferencia del sistema de reducir movimiento.

#### Scenario: Movimiento reducido
- **WHEN** el dispositivo informa `prefers-reduced-motion: reduce`
- **THEN** la interfaz elimina desplazamientos, escalados y animaciones no esenciales

### Requirement: Feedback consistente
Las operaciones MUST usar estados compartidos de carga, éxito, error, vacío y confirmación, y MUST NOT depender de `alert` o `confirm` nativos del navegador.

#### Scenario: Acción destructiva
- **WHEN** el usuario intenta eliminar una entidad
- **THEN** se muestra un diálogo accesible que identifica el objeto y las consecuencias
- **AND** el foco regresa al control de origen al cancelar

#### Scenario: Error de formulario
- **WHEN** un formulario contiene datos inválidos
- **THEN** muestra un resumen comprensible y mensajes asociados a los campos afectados
- **AND** conserva los valores ingresados

#### Scenario: Resultado de una acción
- **WHEN** una operación finaliza
- **THEN** la interfaz comunica el resultado sin exigir una recarga manual
- **AND** evita que mensajes temporales bloqueen la siguiente acción
