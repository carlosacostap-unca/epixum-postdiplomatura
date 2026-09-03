## Context

La motivación funcional está documentada en [proposal.md](./proposal.md). En el estado actual, `courses.teachers` es la fuente de verdad de las asignaciones docentes y `course_enrollments` representa las matrículas vigentes. El formulario general de curso modifica la relación docente completa y las altas estudiantiles existentes se realizan mediante credenciales o invitaciones. Las mutaciones privilegiadas ya siguen el patrón de Server Action autenticada, cliente PocketBase de servicio y verificación posterior.

La solución debe preservar esa topología de datos, la exclusividad docente-estudiante dentro de un mismo curso y todos los registros históricos. También debe funcionar con el stack actual —Next.js App Router, React, TypeScript, Tailwind y PocketBase JS SDK 0.26— sin incorporar dependencias externas ni envío de correos.

## Goals / Non-Goals

**Goals:**

- Dar a cada curso un contexto administrativo estable con destinos separados para configuración, participantes y acceso.
- Centralizar la lectura y mutación de alumnos y docentes en APIs internas tipadas, autorizadas y verificables.
- Hacer que las incorporaciones múltiples de alumnos sean atómicas y que toda mutación comunique el estado persistido real.
- Mantener una experiencia equivalente con teclado, lector de pantalla, escritorio y móvil.
- Garantizar mediante pruebas que retirar una participación no elimina actividad histórica ni otras participaciones.

**Non-Goals:**

- Reemplazar `courses.teachers` o `course_enrollments` por una tabla polimórfica de roles.
- Convertir automáticamente una participación en otra, retirar participantes en masa o eliminar cuentas.
- Cambiar la semántica de las invitaciones o añadir entrega de emails.
- Delegar esta administración a docentes; las nuevas mutaciones directas son exclusivas de administradores globales.

## Decisions

### 1. Usar navegación contextual con rutas dedicadas

La administración de un curso se organizará bajo un layout compartido para `/admin/courses/[id]`, con destinos Configuración, Participantes y Acceso. Configuración conservará la edición general; Participantes alojará alumnos y docentes; Acceso reunirá modalidad, clave e invitaciones. Tras crear un curso, el flujo podrá conducir a Participantes para completar el equipo sin sobrecargar el formulario inicial.

Esto mantiene URLs enlazables, límites claros de carga y estados de navegación accesibles. Se descarta una única página extensa con acordeones porque mezcla tareas con frecuencias e impactos diferentes y dificulta conservar el contexto en móvil.

### 2. Mantener las fuentes de verdad actuales

La lista de docentes se derivará de `courses.teachers`; la de alumnos, de `course_enrollments` expandida con `student`; y las invitaciones seguirán en su colección existente. Se añadirá una capa de lectura específica para participantes que entregue conteos, resultados paginados y candidatos compatibles sin duplicar relaciones.

Se descarta introducir una colección genérica `course_participants`: exigiría migrar datos, reglas y consultas sin aportar una capacidad que las relaciones actuales no puedan representar.

### 3. Separar miembros vigentes de candidatos

La página de Participantes renderizará inicialmente en servidor el curso, los conteos y la primera página del grupo activo. Las búsquedas de miembros se resolverán por nombre o correo con paginación. El diálogo de incorporación consultará candidatos desde el servidor a partir de dos caracteres, excluirá cuentas ya incorporadas y marcará como incompatibles las que tengan la participación opuesta.

Esto evita cargar toda la colección de usuarios en el cliente y permite escalar sin abandonar la respuesta inicial rápida. Se descarta reutilizar el `<select multiple>` actual porque no ofrece búsqueda eficaz, explicación por candidato ni una interacción móvil y de teclado consistente.

### 4. Encapsular las mutaciones en Server Actions administrativas

Se crearán acciones equivalentes a `addCourseStudents`, `removeCourseStudent`, `addCourseTeachers` y `removeCourseTeacher`. Cada acción obtendrá la sesión del servidor, exigirá `role === "admin"`, normalizará identificadores, releerá curso y relaciones vigentes, validará pertenencia y exclusividad, y sólo entonces usará el cliente de servicio.

Las altas múltiples de alumnos validarán el conjunto completo antes de escribir y utilizarán `pb.createBatch()` para crear las matrículas en una operación atómica. La API batch debe estar habilitada en PocketBase; el despliegue toma un snapshot de esa configuración y la activa sin modificar reglas ni registros. La incorporación o retiro de docentes actualizará una sola vez la relación completa del curso a partir del estado recién leído. No habrá una secuencia cliente de leer-modificar-escribir porque permitiría evadir validaciones o sobrescribir cambios concurrentes con datos obsoletos.

### 5. Releer y revalidar después de cada mutación

Una acción sólo devolverá éxito después de releer la matrícula exacta o la relación `teachers` y comprobar el resultado esperado. Luego revalidará la página administrativa del curso, el listado de cursos y las superficies docentes o estudiantiles cuyo acceso pueda cambiar. La interfaz consumirá un resultado discriminado (`success`, `conflict`, `not-found`, `forbidden`, `error`) para mantener abierto el diálogo cuando el usuario pueda corregir la operación.

Se descarta el optimismo no verificado para cambios de acceso: la respuesta visual podría divergir de PocketBase y mostrar permisos que todavía no existen.

### 6. Exigir una transición explícita entre alumno y docente

Una cuenta con la participación opuesta en el mismo curso aparecerá inhabilitada con explicación. Para cambiarla, el administrador deberá retirar primero la participación actual y después incorporarla con la nueva. Ambas acciones mostrarán el impacto antes de confirmar.

Esta secuencia hace visible la pérdida de acceso y evita una conversión implícita difícil de auditar. No se implementa una acción compuesta de conversión porque ocultaría dos decisiones de negocio diferentes y complicaría la recuperación ante conflictos.

### 7. Retirar acceso sin borrar historia

Retirar un alumno eliminará únicamente el registro de `course_enrollments`; retirar un docente quitará únicamente su identificador de `courses.teachers`. No se ejecutarán cascadas manuales sobre entregas, consultas, respuestas, evaluaciones, archivos, invitaciones o usuarios. Antes del despliegue se auditarán las relaciones de PocketBase para confirmar que ninguna referencia histórica tenga una cascada destructiva vinculada a la matrícula.

Se descarta anonimizar o borrar actividad porque el requisito es retirar acceso futuro, no reescribir el historial académico.

### 8. Construir una superficie accesible y responsive

En escritorio, alumnos y docentes usarán una tabla con nombre, correo, participación y acciones. En pantallas angostas, la misma información se presentará como tarjetas. Las pestañas expondrán su estado semántico; los diálogos atraparán el foco, enfocarán el buscador al abrir, restaurarán el foco al cerrar y permitirán confirmar o cancelar con teclado. Estados de carga, resultado y error se anunciarán en una región viva, y los botones quedarán deshabilitados durante la mutación.

Se reutilizarán componentes visuales y tokens existentes, extendiéndolos sólo donde falten primitivas de diálogo, pestañas o selector. Se descarta una dependencia de componentes nueva para conservar coherencia y reducir superficie de mantenimiento.

## Risks / Trade-offs

- [La búsqueda de usuarios puede degradarse al crecer la colección] → Consultar en servidor desde dos caracteres, limitar y paginar resultados, seleccionar únicamente los campos necesarios y mantener índices compatibles con los filtros usados.
- [Dos administradores pueden editar participantes simultáneamente] → Releer inmediatamente antes de mutar, usar batch atómico para altas múltiples, actualizar docentes desde el estado vigente y verificar después de escribir.
- [Eliminar una matrícula podría activar una cascada no prevista] → Auditar el esquema y probar con registros históricos antes del despliegue; bloquear la salida si se detecta una relación destructiva.
- [Mover controles de acceso puede romper enlaces o hábitos existentes] → Mantener redirecciones o enlaces claros desde la edición actual y reutilizar los componentes de claves e invitaciones sin cambiar su semántica.
- [Un lote inválido impide incorporar candidatos válidos] → Mostrar validación por candidato antes de confirmar y devolver conflictos específicos; se prioriza atomicidad sobre éxitos parciales difíciles de interpretar.
- [La revalidación de varias superficies aumenta el costo de cada mutación] → Revalidar sólo rutas conocidas afectadas y medir antes de ampliar la invalidación.

## Migration Plan

1. Añadir lecturas, acciones y pruebas de autorización/conservación sin cambiar la interfaz existente.
2. Verificar en una copia o entorno de prueba que las relaciones históricas no dependan destructivamente de `course_enrollments` y ejecutar la auditoría de roles vigente.
3. Incorporar el layout contextual y la página de Participantes; mantener temporalmente enlaces desde el formulario actual.
4. Mover la administración de invitaciones y acceso a su destino dedicado y retirar el selector múltiple docente del formulario general cuando las pruebas de flujo estén verdes.
5. Ejecutar pruebas unitarias, de integración, esquema, acceso real y E2E responsive antes de desplegar.
6. Desplegar sin migración de registros: los docentes, matrículas e invitaciones existentes se leen desde sus colecciones actuales.

Para revertir, se restaurarán las rutas y el formulario anteriores manteniendo intactas las mismas relaciones y se repondrá desde el snapshot la configuración batch de PocketBase. Como no se transforma ni copia información, no se requiere rollback de datos; cualquier ajuste de configuración o reglas de PocketBase tendrá un script con snapshot previo y restauración comprobable.
