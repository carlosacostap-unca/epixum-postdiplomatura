# Clases interactivas: preparación y sesiones en vivo

Se pueden preparar materiales privados, asociarlos a clases habituales y conducir sesiones sincronizadas. Se admiten opción múltiple, encuestas y respuestas breves; los resultados son privados del equipo docente y no generan calificaciones. El objetivo es alrededor de 100 alumnos por sesión.

## Uso

1. Administración → Cursos → configuración del curso → **Habilitar clases interactivas**.
2. Docencia → **Clases interactivas**, o pestaña **Interactivas** dentro del curso.
3. Crear una entrada con título y descripción opcional. Se puede guardar como borrador sin clase ni material.
4. Importar un archivo de material preparado con ayuda de Codex. El formulario ofrece un ejemplo descargable.
5. Seleccionar una clase habitual del mismo curso y marcar **Preparada** cuando tenga contenido válido.
6. Abrir la vista previa para recorrer pantallas y probar respuestas. Ninguna respuesta del ensayo se guarda.

Cada clase habitual puede tener varios materiales asociados. Desde su detalle hay enlaces para verlos o crear otro con la asociación preseleccionada. Deshabilitar la opción oculta los materiales y bloquea su gestión sin borrarlos. Eliminar una clase habitual conserva el material, que necesita una nueva asociación para considerarse preparado.

## Preparar archivos con Codex

Usar `public/interactive-class-example.json` como referencia y validar con `lib/interactive-material.ts`. El archivo tiene `version: 1` y un arreglo `screens` ordenado, con 1 a 80 pantallas y hasta 200000 bytes UTF-8. El título de la clase y la asociación se gestionan en Epixum, fuera del archivo.

Todas las pantallas tienen `id` único (letras, números, guion y guion bajo; hasta 64 caracteres), `type`, `title` (hasta 160) y `body` opcional en Markdown (hasta 12000). En pantallas `content`, `body` es obligatorio.

| Tipo | Campos adicionales |
| --- | --- |
| `content` | Contenido Markdown en `body`. |
| `multiple-choice` | `options`: entre 2 y 8 objetos `{id,label}`; `correctOptionId`: ID de una opción; `explanation` opcional hasta 2000 caracteres. Una respuesta correcta. |
| `poll` | `options`: entre 2 y 8 opciones. Sin respuesta correcta. |
| `short-answer` | `maxLength` opcional entre 1 y 2000; por defecto 500. |

Las opciones usan identificadores únicos por pantalla y etiquetas de hasta 300 caracteres. Se rechazan propiedades desconocidas y versiones incompatibles. No se ejecuta HTML ni JavaScript importado. Para futuras simulaciones o diseños especiales se ampliará el reproductor con componentes registrados.

## Datos y permisos

- `courses.interactiveClassesEnabled`: booleano opcional, falso por defecto, configurable solo por administración.
- `interactive_lessons`: `course` obligatorio e inmutable, `class` opcional, `title`, `description`, `status` (`draft` o `ready`), `material` JSON y fechas.
- Solo los docentes asignados al curso habilitado acceden a materiales. La cuenta administrativa no obtiene acceso docente por su rol global; la infraestructura superuser sigue conservando su acceso de mantenimiento.
- Las acciones verifican permisos, pertenencia y material. Las reglas PocketBase también restringen lectura y escritura directa, inmutabilidad de curso y asociación de clase. Materiales escritos directamente fuera de la app vuelven a validarse antes de mostrarse.
- `ready` expresa preparación, no publicación ni sesión abierta. La vista calcula borrador efectivo si falta la clase o el material es inválido.

## Migración y verificación

Con las credenciales de PocketBase ya configuradas en `.env.local`:

```powershell
npm run schema:interactive-classes
npm run schema:interactive-classes:test
npm run schema:interactive-classes:verify
```

La migración es aditiva e idempotente: conserva datos, índices y campos existentes, agrega la colección y actualiza la regla administrativa compartida. No habilita ningún curso. Aplicarla antes de desplegar la aplicación. La verificación de acceso crea cuentas y cursos de prueba y los elimina al terminar, sin enviar correos.

Reversión: deshabilitar la opción en los cursos y volver a la versión anterior del código; conservar los registros para una reactivación posterior.

## Dar una clase en vivo

1. En el detalle de un material preparado, elegir **Iniciar o retomar sesión en vivo**. Se guarda una copia inmutable y se abre el panel docente. Abrir otra vez el mismo material retoma su sesión activa.
2. Compartir el enlace o el código de ocho caracteres. El alumno también encuentra **Ingresar a clase en vivo** en su navegación. Debe tener matrícula en ese curso; el código por sí solo no otorga acceso.
3. Si falta iniciar sesión, el login conserva el enlace y su código. Se utiliza la misma cuenta del campus.
4. **Siguiente pantalla** y **Anterior** sincronizan la pantalla. Cada cambio deja las respuestas cerradas. En una actividad, **Abrir respuestas** habilita los envíos y **Cerrar respuestas** los detiene.
5. Cada alumno envía una sola respuesta por actividad y sesión. Reabrir una actividad conserva las respuestas; para repetirla con respuestas nuevas hay que iniciar otro encuentro. Los reintentos de red no duplican registros.
6. El panel muestra nombres, conexión reciente, respuestas individuales y distribución de opciones. El selector **Consultar actividad** cambia la consulta privada sin mover la pantalla del grupo. Las soluciones de opción múltiple son sólo para docentes.
7. **Finalizar sesión** cierra definitivamente los envíos. Para volver a usar el material, iniciar una nueva sesión con otro código. **Sesiones e historial** conserva los encuentros, incluidos aquellos cuyo material original se eliminó.

Conduce el docente que inició el encuentro. Los demás docentes asignados al curso pueden consultar su estado e historial. No hay toma de control en esta versión. La presencia se renueva cada 15 segundos y caduca a los 45 segundos sin latido; orienta sobre conectividad, no certifica asistencia. El cierre de una pestaña se refleja después de ese plazo.

Las pantallas se componen de Markdown y actividades estructuradas. No se ejecutan sitios HTML/JavaScript arbitrarios. Las simulaciones especiales futuras necesitan componentes registrados en el reproductor.

## Persistencia y transporte

- `interactive_sessions`: clase y material de origen, títulos conservados, código, docente conductor, pantalla pública activa, revisión y estado. No contiene soluciones ni pantallas futuras. Ocho campos de opciones permiten validar igualdad exacta en reglas sin depender del recorrido de arreglos JSON de PocketBase.
- `interactive_session_materials`: copia completa privada e inmutable, una por sesión. La sesión y la copia se crean en un batch transaccional.
- `interactive_participants`: una participación por alumno y sesión; fechas generadas por PocketBase y latidos sin sobrescribirlas.
- `interactive_responses`: una respuesta por alumno, pantalla y sesión, sin actualización ni borrado desde el cliente. Regla de creación comprueba matrícula, participación, sesión abierta, pantalla, revisión, opciones válidas y actividad habilitada. La API valida además el límite específico del texto breve; el esquema limita todo texto a 2000 caracteres.

Las lecturas y escrituras usan credenciales del usuario y reglas contextuales de PocketBase. El cliente de servicio sólo resuelve el código antes del ingreso; las mutaciones vuelven a verificar matrícula usando la cuenta del alumno. Las cookies son HttpOnly y los endpoints de escritura verifican origen. No se comparte un cliente autenticado de alumno entre solicitudes.

SSE entrega notificaciones de cambio y el navegador vuelve a consultar el estado durable. La conexión se renueva aproximadamente cada 55 segundos; se comprueban permisos al reconectar. También hay lectura cada 10 segundos, al recuperar la red y al volver a la pestaña. Los eventos del panel docente se agrupan para evitar una lectura por cada alumno. El cambio de pantalla o cierre compara una revisión en la base de datos y rechaza comandos obsoletos, incluso entre procesos Next distintos.

## Instalación en el VPS

Aplicar antes de desplegar el nuevo código:

```sh
npm ci
npm run schema:interactive-classes
npm run schema:live-interactive
npm run build
```

Se requieren las variables existentes `NEXT_PUBLIC_POCKETBASE_URL` y las credenciales de servicio `POCKETBASE_SUPERUSER_EMAIL`/`POCKETBASE_SUPERUSER_PASSWORD` (o sus alias ADMIN). Mantenerlas sólo en el servidor. PocketBase debe tener batch habilitado para al menos dos operaciones; consultar `npm run schema:course-participants:batch -- status` y usar el procedimiento existente de activación con snapshot si hace falta. La migración en vivo es aditiva, idempotente y no habilita cursos ni abre sesiones.

Si se usa Nginx, integrar en la configuración existente una ubicación equivalente, ajustando el puerto interno:

```nginx
location /api/interactivas/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 120s;
}
```

Preservar `Host` es necesario para la verificación de origen. No requiere afinidad de sesiones entre procesos; PocketBase guarda el estado. Cada navegador activo utiliza una conexión con Next y una suscripción PocketBase desde ese proceso. Comprobar límites de archivos/conexiones del VPS y del proxy durante una prueba allí. No se modificó ni desplegó la configuración del VPS desde este cambio.

## Verificación de la etapa en vivo

```powershell
npm run test:ui -- lib/live-interactive-contract.test.ts
$env:LIVE_INTEGRATION='1'
npm run test:ui -- lib/live-interactive.integration.test.ts
Remove-Item Env:LIVE_INTEGRATION
# En otra terminal: npm run start -- -p 3002
npm run verify:live-concurrency
```

Las pruebas de integración y concurrencia crean cuentas/cursos temporales en el PocketBase configurado y los eliminan al terminar. No envían correos. La prueba de carga sólo acepta Next en localhost; `LIVE_TEST_ORIGIN` permite elegir otro puerto local. No ejecutar simultáneamente contra un entorno sin margen de recursos.

Medición del 3 de octubre de 2026, compilación de producción de Next en esta computadora y PocketBase configurado:

| Comprobación | Resultado |
| --- | --- |
| Conexiones de alumnos listas | 100 |
| Notificaciones SSE recibidas | 100 de 100 |
| Latencia de notificación de cambio, p95 / máxima | 647 / 663 ms |
| Lectura concurrente de 100 estados, duración total | 4165 ms |
| Envío concurrente de 100 respuestas, duración total | 1236 ms |
| Respuestas guardadas después de repetir los 100 envíos | 100, sin duplicados |
| Privacidad y recuperación de sesión cerrada | Verificadas |

Reporte detallado local: `output/live-interactive/concurrency.json`. Esta medición confirma el escenario probado; no garantiza los mismos tiempos ni capacidad en el VPS. Se verificaron además permisos de base de datos, rechazo de revisiones viejas, eliminación de matrícula, copia histórica, tipado, lint y compilación. La prueba de OAuth con Google real requiere la cuenta del usuario; en el navegador se verificó el retorno al login y se usaron cuentas temporales para el flujo autenticado.

Referencias: [reglas de PocketBase](https://pocketbase.io/docs/api-rules-and-filters/), [realtime de PocketBase](https://pocketbase.io/docs/api-realtime/).
