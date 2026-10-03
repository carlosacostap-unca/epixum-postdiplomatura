## Purpose

Conducir encuentros interactivos identificados y conservar sus respuestas para consulta docente, sin generar calificaciones.

## ADDED Requirements

### Requirement: Sesión independiente de la preparación
El sistema MUST permitir a un docente asignado abrir una sesión de un material preparado en un curso habilitado, conservando una copia privada e inmutable del material y la referencia a la clase habitual. MUST generar enlace y código aleatorios, impedir sesiones simultáneas del mismo material y conservar el historial al editar o eliminar la preparación.

#### Scenario: Apertura repetida
- **WHEN** el docente solicita abrir dos veces el mismo material
- **THEN** recibe la misma sesión activa, sin duplicarla

### Requirement: Ingreso identificado y contextual
El sistema MUST permitir ingresar con código únicamente a cuentas autenticadas con matrícula vigente en el curso habilitado. MUST impedir que un código otorgue acceso a personas ajenas y registrar una sola participación por alumno y sesión.

#### Scenario: Código compartido fuera del curso
- **WHEN** una cuenta no matriculada presenta un código válido
- **THEN** el ingreso es rechazado sin revelar contenido ni participantes

### Requirement: Conducción y sincronización
El docente que abre la sesión MUST controlar la pantalla activa, abrir o cerrar actividades y finalizar el encuentro. Los demás docentes asignados MUST poder consultar. Los comandos MUST rechazar revisiones obsoletas y una sesión finalizada MUST permanecer cerrada. Los alumnos MUST recibir sólo la pantalla activa sin soluciones ni pantallas futuras y recuperar el estado después de reconectarse.

#### Scenario: Cambio concurrente
- **WHEN** dos comandos usan la misma revisión inicial
- **THEN** sólo uno modifica la sesión y el otro solicita actualizar el estado

### Requirement: Respuestas privadas persistentes
El sistema MUST aceptar una respuesta por alumno y actividad, sólo mientras está abierta en una sesión activa. MUST validar las opciones y límites de texto, hacer seguros los reintentos y permitir al alumno consultar únicamente su propia respuesta. Los resultados completos MUST ser exclusivos de los docentes asignados y no modificar calificaciones.

#### Scenario: Actividad cerrada durante el envío
- **WHEN** una respuesta nueva llega después de cerrar o cambiar la actividad
- **THEN** la base de datos rechaza el registro

### Requirement: Presencia y capacidad
El sistema MUST mostrar al docente participantes identificados y presencia reciente mediante latidos, diferenciando desconexión de abandono definitivo. MUST soportar reconexión y validar el objetivo de aproximadamente 100 alumnos mediante una prueba concurrente del entorno disponible, documentando sus límites.

#### Scenario: Reconexión de un alumno
- **WHEN** un alumno vuelve después de perder la conexión
- **THEN** recupera la pantalla y su respuesta guardada sin duplicar participación
