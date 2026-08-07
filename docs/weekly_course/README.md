# Organización semanal de cursos

## Modelo

Cada curso define `organizationMode`:

- `tradicional`: conserva las listas planas de clases, trabajos prácticos y consultas.
- `semanal`: organiza el contenido mediante registros de `course_weeks`.

Las clases, los trabajos prácticos y las consultas mantienen su relación directa con `course` y pueden tener una relación opcional `week`. Cambiar la modalidad nunca crea, mueve ni elimina contenido. Las relaciones semanales se conservan al volver a la modalidad tradicional y reaparecen si el curso vuelve a ser semanal.

El contenido sin semana es válido para facilitar migraciones y reorganizaciones, pero en un curso semanal sólo lo ve y administra el equipo docente.

## Estados y visibilidad efectiva

Una semana posee un número entero no negativo (desde `0`) y único dentro del curso, título obligatorio y fechas de inicio/finalización opcionales.

En el esquema de PocketBase, `number` no usa el indicador `required` porque PocketBase interpreta esa opción numérica como “distinto de cero”. El campo continúa siendo no nulo, toma `0` como valor base y la aplicación valida explícitamente que se envíe un entero no negativo.

- `borrador`: sólo visible para administración y docentes asignados.
- `publicada`: visible inmediatamente para estudiantes matriculados.
- `programada`: visible para estudiantes cuando `publishAt <= ahora`.

La publicación programada se calcula en cada lectura. No existe un cron ni una transición persistente automática. Las próximas acciones, portadas, detalles, recursos, entregas y consultas aplican el mismo cálculo.

## Permisos

| Operación | Administrador | Docente asignado | Docente ajeno | Estudiante matriculado |
| --- | --- | --- | --- | --- |
| Configurar modalidad | Sí | No | No | No |
| Crear, editar o eliminar semanas | No | Sí | No | No |
| Organizar contenido | No | Sí | No | No |
| Ver borradores y contenido sin semana | Sí | Sí | No | No |
| Ver semanas efectivamente publicadas | Sí | Sí | No | Sí |
| Crear consultas semanales | No | No | No | Sí, dentro de una semana visible |

Las acciones del servidor y las reglas de PocketBase validan además que curso, semana, clase, trabajo y consulta pertenezcan al mismo curso. Las reglas usan los identificadores anidados de relaciones (`relation.id`) requeridos por PocketBase.

## Migración y verificación

La migración es idempotente y se ejecuta con:

```powershell
npm run setup:enrollment
```

Lee las credenciales desde `.env.local`, agrega campos y reglas sin reconstruir colecciones, inicializa como `tradicional` únicamente los cursos sin modalidad y no asigna contenido a semanas.

Validaciones recomendadas después de desplegar:

```powershell
npm run schema:test
npm run schema:access-test
npm run test:ui
npm run build
```

`schema:access-test` crea identidades y cursos temporales, prueba administración, docentes asignados/ajenos y estudiantes, y elimina exclusivamente esos fixtures al finalizar.

## Rollback

El rollback funcional y seguro consiste en cambiar los cursos afectados a `tradicional`. Esto restaura las listas planas sin perder semanas ni relaciones.

No se recomienda eliminar `course_weeks` ni los campos `organizationMode`/`week` como rollback habitual. Un rollback estructural requiere antes una copia de seguridad de PocketBase, desplegar una versión de la aplicación que no consulte esos campos, desasignar o exportar las relaciones y recién después retirar reglas, relaciones y colección. No hay un script destructivo automatizado para esta operación.

## Criterios de aceptación

- Los cursos tradicionales mantienen el comportamiento previo.
- Sólo administración puede alternar la modalidad.
- Sólo el docente asignado administra semanas y organización.
- Borradores, semanas futuras y contenido sin asignar no aparecen al estudiante ni por URL directa.
- Una clave correcta de curso y las matrículas existentes continúan funcionando.
- Las consultas de cursos semanales siempre pertenecen a una semana visible.
- El gestor funciona a 320 px, con reflujo equivalente a zoom 200 %, teclado, objetivos táctiles y preferencia de movimiento reducido.
