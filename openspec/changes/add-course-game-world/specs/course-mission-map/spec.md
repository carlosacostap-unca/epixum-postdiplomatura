## Purpose

Ofrecer una forma optativa y accesible de recorrer las clases y trabajos de un curso mediante un mapa de aldea y misiones vinculadas al aula.

## ADDED Requirements

### Requirement: Creación de personaje y perfil real antes de jugar
El sistema MUST solicitar en el primer ingreso un personaje hombre o mujer con vestimenta y características personalizables, y nombre, apellido, DNI, email de contacto, teléfono y fecha de nacimiento válidos. MUST precargar los datos propios disponibles y persistir personaje y confirmación del perfil antes de iniciar el recorrido. MUST NOT modificar el email de acceso al cambiar el contacto ni exponer datos personales a otros alumnos o al motor gráfico.

#### Scenario: Primer ingreso
- **WHEN** el estudiante matriculado no tiene onboarding guardado
- **THEN** crea el personaje y confirma los datos antes de poder iniciar el recorrido.

#### Scenario: Perfil inválido o guardado fallido
- **WHEN** falta un dato obligatorio o falla la escritura
- **THEN** se indica el error, se conservan las entradas en el formulario y no se habilita el siguiente paso.

### Requirement: Recorrido guiado reanudable
El sistema MUST ofrecer un recorrido con explicación del mapa, encuentros, misiones, progreso y salida. MUST guardar avance por alumno/curso, exigir finalización antes del juego libre y reanudar ingresos incompletos. MUST verificar autorización y secuencia en servidor, sin aceptar un salto de pasos enviado por cliente.

#### Scenario: Regreso durante el recorrido
- **WHEN** el alumno sale y vuelve después de guardar un paso
- **THEN** conserva personaje y perfil y retoma el recorrido pendiente.

#### Scenario: Regreso después de completar
- **WHEN** el alumno ya completó el recorrido
- **THEN** accede al mapa con su personaje sin repetir el onboarding.

### Requirement: Salida a Epixum
El juego y el onboarding MUST ofrecer un enlace a `https://www.epixum.com` como salida a la plataforma, sin enviar datos personales en la URL.

#### Scenario: Salida del juego
- **WHEN** el alumno elige Volver a Epixum
- **THEN** navega al dominio confirmado sin cerrar sesión explícitamente ni incluir datos del perfil en el enlace.

### Requirement: Entrada inmersiva y menú de juego
El sistema MUST abrir la aventura a ventana completa al entrar en un curso habilitado como estudiante matriculado. MUST ofrecer un menú operable por teclado para salir a Epixum sin cerrar sesión, acceder al aula clásica, consultar encuentros, misiones, progreso y ayuda, y controlar animaciones. El aula clásica MUST continuar accesible explícitamente. Los paneles MUST cerrar con Escape, devolver el foco y suspender la animación mientras estén abiertos.

#### Scenario: Entrada al piloto
- **WHEN** un estudiante matriculado abre la portada del piloto sin solicitar la vista clásica
- **THEN** entra en la aventura sin cabecera ni barra lateral del campus.

#### Scenario: Salida y modalidad clásica
- **WHEN** abre el menú y elige Salir del aula o Aula clásica
- **THEN** navega respectivamente a Epixum o a la portada clásica sin un ciclo de redirecciones ni cierre de sesión.

#### Scenario: Menú accesible
- **WHEN** abre el menú con teclado y luego presiona Escape
- **THEN** el diálogo cierra, el foco vuelve al botón que lo abrió y se restablece la preferencia de animación previa.

### Requirement: Aldea pixel art animada
El mapa MUST presentar una aldea pixel art original con entorno animado, entrada al Nodo conectada a la lista de encuentros, controles por teclado y alternativa en lista. MUST ofrecer pausa y respetar la preferencia de movimiento reducido. MUST liberar el motor al salir del mapa y mantener navegación accesible ante fallo gráfico.

#### Scenario: Selección en el mapa
- **WHEN** el estudiante selecciona un edificio con puntero o teclado
- **THEN** se abre el interior con acceso a los encuentros desde sus aulas y una lista alternativa.

#### Scenario: Movimiento reducido o pausa
- **WHEN** el estudiante prefiere movimiento reducido o pausa las animaciones
- **THEN** el entorno queda estático y se conserva la selección de lugares.

#### Scenario: Motor no disponible
- **WHEN** falla la carga del motor gráfico
- **THEN** se informa el fallo y la lista y los controles de encuentros siguen disponibles.

### Requirement: Activación y acceso por curso
El sistema MUST ofrecer el mapa solo en cursos habilitados explícitamente y a usuarios autenticados con matrícula vigente, excluyendo docentes asignados al mismo curso y cursos en borrador. MUST conservar el acceso al aula habitual.

#### Scenario: Piloto de cohorte 2
- **WHEN** un estudiante matriculado abre la cohorte 2 habilitada
- **THEN** encuentra un acceso a Aventura y puede volver al aula.

#### Scenario: Acceso no autorizado
- **WHEN** una persona sin matrícula o un docente del curso solicita directamente el mapa
- **THEN** no recibe el mapa ni sus datos.

#### Scenario: Curso sin habilitar
- **WHEN** se abre otro curso sin configuración de juego
- **THEN** no aparece el acceso y la ruta de aventura no está disponible.

### Requirement: Recorrido conectado al contenido publicado
El mapa MUST mostrar únicamente clases y trabajos visibles del curso actual, conservar sus títulos y destinos reales y presentar una alternativa de lista operable por teclado. MUST NOT inferir el temario a partir del número de clase ni exigir completar el mapa para acceder al aula.

#### Scenario: Recurso oculto
- **WHEN** una clase o trabajo está en borrador o programado para una publicación futura
- **THEN** no se expone en el mapa ni en la lista.

#### Scenario: Navegación entre vistas
- **WHEN** el estudiante cambia de mapa a lista y selecciona una clase
- **THEN** puede abrir la misma clase en el aula con teclado o interacción táctil.

### Requirement: Progreso académico verificable
Las misiones de trabajos MUST reflejar las entregas propias y los estados de evaluación estudiantil del aula. MUST contar como completados solo los trabajos aprobados mediante evaluación publicada. MUST NOT modificar entregas, notas, fechas, asistencia o resultados ni exponer borradores de evaluación.

#### Scenario: Entrega sin revisión publicada
- **WHEN** existe una entrega con evaluación en borrador
- **THEN** la misión indica entrega registrada y no aprobación.

#### Scenario: Trabajo aprobado
- **WHEN** la evaluación publicada de la entrega actual indica aprobación
- **THEN** la misión aparece completada y contribuye al progreso de restauración de la aldea.

#### Scenario: Corrección y reenvío
- **WHEN** se solicita corregir o se reenvía una entrega
- **THEN** el mapa conserva el estado estudiantil correspondiente sin mantener una aprobación anterior como actual.

### Requirement: Contenido pendiente y fallos
El sistema MUST explicar la ausencia de trabajos publicados sin inventar misiones académicas. MUST diferenciar errores de lectura de estados vacíos y MUST NOT convertir fallos de red en progreso cero.

#### Scenario: Cohorte sin trabajos
- **WHEN** el curso tiene clases pero no trabajos publicados
- **THEN** el estudiante puede recorrer las clases y ve que las misiones de entrega aparecerán cuando se publiquen.

#### Scenario: Lectura fallida
- **WHEN** falla la consulta de entregas o contenido
- **THEN** se muestra un error recuperable y no un mapa con datos incompletos.

### Requirement: Sede Nodo Tecnológico Catamarca
El juego MUST representar el Nodo Tecnológico Catamarca con fachada vidriada azul, marco claro, entrada central y escalinata inspirados en las fotografías aportadas. Todas las clases publicadas MUST accederse desde este único edificio, conservando sus enlaces y títulos oficiales.

#### Scenario: Entrar al Nodo
- **WHEN** el estudiante activa el edificio mediante puntero o teclado
- **THEN** se abre el interior con puertas para todos los encuentros publicados; las clases que exceden ocho se distribuyen en alas adicionales

### Requirement: Desplazamiento del personaje
El personaje MUST poder caminar con flechas, WASD y controles táctiles. MUST respetar límites del mapa, fachada y río, permitiendo el cruce por el puente. MUST detenerse con paneles o tutorial abiertos, pérdida de foco o pestaña oculta, sin bloquear movimiento por la pausa ambiental. Cruzar el acceso central MUST abrir el interior transitable y permitir volver al exterior sin reabrirla automáticamente.

#### Scenario: Entrada caminando
- **WHEN** el personaje cruza el umbral central del Nodo
- **THEN** entra al pasillo interior, sin reactivar el umbral automáticamente

#### Scenario: Alternativa accesible
- **WHEN** el alumno prefiere no desplazarse
- **THEN** puede acceder a los mismos encuentros desde los controles HTML existentes

### Requirement: Interior del Nodo y aulas
Entrar al Nodo MUST llevar a un interior transitable. El sistema MUST ofrecer una puerta por clase publicada y acceso al aula específica al cruzarla o activarla con teclado/táctil, y al contenido desde su pizarra. MUST conservar acceso alternativo en lista y salida al exterior, sin modificar el progreso académico. MUST distribuir más de ocho clases en alas adicionales sin truncarlas.

#### Scenario: Recorrido hasta una clase
- **WHEN** el personaje entra al Nodo y cruza la puerta de un aula
- **THEN** entra a su aula transitable, puede interactuar con la pizarra para acceder a la clase y regresar al pasillo

#### Scenario: Salida al exterior
- **WHEN** el personaje cruza la salida sur o el alumno activa Salir al jardín
- **THEN** vuelve al mapa exterior sin reentrar automáticamente

### Requirement: Aula transitable con pizarra interactiva
Cada aula MUST ser un espacio donde el personaje camine entre escritorios y sillas con colisiones. Entrar MUST NOT abrir inmediatamente el panel de contenido. La pizarra MUST habilitar el acceso a la clase correspondiente solo al acercarse, mediante E o botón táctil. El contenido MUST seguir disponible por la lista accesible. Cerrar el panel MUST conservar al personaje en el aula y salir por la puerta MUST devolverlo al pasillo.

#### Scenario: Interacción con la pizarra
- **WHEN** el alumno se acerca a la pizarra y presiona E o activa Ver pizarra
- **THEN** se muestra el contenido publicado de esa clase dentro de la pizarra sin registrar progreso académico

#### Scenario: Pizarra distante
- **WHEN** el personaje está lejos de la pizarra
- **THEN** el control se muestra deshabilitado y E no abre el contenido

### Requirement: Lectura integrada en la pizarra
La pizarra MUST mostrar la descripción publicada y materiales de la clase dentro del juego sin navegar al aula clásica. MUST consultar con sesión estudiantil, verificar matrícula y pertenencia de clase al curso y excluir recursos ocultos o docentes. MUST reconstruir el HTML permitido sin scripts ni atributos ejecutables. MUST ofrecer visores para materiales compatibles y una alternativa explícita para recursos externos que no puedan incrustarse. MUST diferenciar error, carga y contenido pendiente, y descartar respuestas tardías de otra clase.

#### Scenario: Lectura en el juego
- **WHEN** el alumno activa la pizarra o elige un encuentro desde la lista
- **THEN** lee el contenido en una pizarra superpuesta y al cerrarla continúa en el juego

#### Scenario: Clase o recurso no disponible
- **WHEN** una clase está oculta, pertenece a otro curso o un recurso es exclusivo de docentes
- **THEN** no se muestra ese contenido en la pizarra
