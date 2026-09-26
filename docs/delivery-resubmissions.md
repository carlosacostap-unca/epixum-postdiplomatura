# Activación y auditoría de reenvíos

Este procedimiento agrega versiones e historial a `deliveries`, bloquea las escrituras directas en PocketBase y permite regularizar de manera explícita reenvíos históricos. No modifica candidatos históricos en el modo predeterminado.

## Requisitos

Configurar en `.env.local`:

- `NEXT_PUBLIC_POCKETBASE_URL`
- `POCKETBASE_SUPERUSER_EMAIL` (o `POCKETBASE_ADMIN_EMAIL`)
- `POCKETBASE_SUPERUSER_PASSWORD` (o `POCKETBASE_ADMIN_PASSWORD`)

Antes de ejecutar la migración en producción, guardar una exportación o snapshot de PocketBase y registrar las reglas actuales de la colección `deliveries`.

## 1. Migrar el esquema

```powershell
npm run schema:delivery-resubmissions
```

El comando es idempotente. Agrega los campos del flujo, inicializa las entregas heredadas en la versión 1 y aplica reglas de lectura por pertenencia al curso. Las reglas de creación, actualización y eliminación quedan cerradas porque las mutaciones se validan en el servidor.

## 2. Informar candidatos de la cohorte 6

Obtener primero el identificador exacto del curso y ejecutar:

```powershell
npm run schema:delivery-resubmissions:audit -- --course=<COURSE_ID>
```

El resultado es solamente un informe JSON. Un registro se propone como candidato cuando conserva una evaluación publicada con `Corregir y reenviar` y existe evidencia técnica cercana de una actualización estudiantil de GitHub. Esta heurística es deliberadamente conservadora y no reemplaza la revisión docente.

Comparar cada candidato con la entrega y la actividad del alumno. Copiar únicamente los `deliveryId` confirmados.

## 3. Aplicar confirmaciones

```powershell
npm run schema:delivery-resubmissions:audit -- --course=<COURSE_ID> --apply=<DELIVERY_ID_1>,<DELIVERY_ID_2>
```

El aplicador aborta antes de escribir si algún identificador no pertenece al conjunto de candidatos válidos. Los registros confirmados pasan a la versión 2, quedan como `Reenviado · pendiente de revisión` y conservan la devolución previa en el historial.

Volver a ejecutar el informe sin `--apply` y comprobar en la interfaz docente:

- que el contador y el filtro `Reenviados` incluyan los casos confirmados;
- que cada entrega muestre la versión vigente y la devolución anterior;
- que una nueva evaluación publicada cierre esa versión;
- que `Corregir y reenviar` habilite otro ciclo y que `Aprobado` o `Desaprobado` lo cierre.

## Rollback

No eliminar los campos nuevos: conservarlos permite recuperar el historial y es compatible con registros previos. Para revertir una aplicación histórica puntual, restaurar esos registros desde el snapshot tomado antes de la operación. Para revertir el despliegue completo, restaurar primero la versión anterior de la aplicación y luego las reglas de `deliveries` capturadas antes de la migración; la aplicación anterior depende de escrituras directas y no funcionará mientras `createRule`, `updateRule` y `deleteRule` permanezcan cerradas.

Nunca ejecutar `--apply` sobre una lista no revisada ni usar el identificador de otro curso.
