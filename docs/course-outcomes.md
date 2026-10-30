# Resultados de cursada

La administración habilita **Resultados de cursada** en la configuración de cada curso. La función comienza desactivada y habilitarla no publica ningún resultado automáticamente.

## Uso docente y administrativo

1. Abrir **Resultados de cursada** en el curso y buscar al alumno por nombre o email. También existe un enlace desde su ficha de seguimiento.
2. Elegir **Aprobado**, **No aprobado** o **No completó**.
3. Completar opcionalmente una nota entre 0 y 10 (hasta dos decimales) y una devolución de hasta 5000 caracteres.
4. **Guardar borrador**. El alumno todavía no ve esta versión.
5. **Publicar resultado** y confirmar el destinatario. Se publica únicamente la última versión guardada para ese alumno.

El estado es una decisión explícita del equipo docente; no se calcula desde notas, asistencia ni entregas. Una nota cero es válida y se distingue de un campo vacío.

Al corregir un resultado publicado, guardar modifica solo el borrador. El alumno continúa viendo la publicación anterior hasta publicar la corrección. **Retirar publicación** oculta el resultado sin eliminar el borrador ni el historial. Los botones de publicación se bloquean si hay cambios sin guardar.

## Vista del alumno y privacidad

En el resumen del curso, cada alumno ve exclusivamente su estado publicado, la nota si existe, la devolución si existe y la fecha de publicación. Mientras no haya publicación se muestra un aviso de resultado pendiente, sin inventar un estado académico.

Los alumnos no reciben borradores, historial, nombres de editores ni resultados de compañeros. La identidad se obtiene siempre de la sesión: la consulta estudiantil no acepta un identificador de otro alumno. Los listados y páginas de gestión están restringidos a administradores y docentes asignados.

Deshabilitar la función oculta y bloquea las consultas y acciones, conservando los datos. Retirar una matrícula revoca el acceso del alumno y conserva el resultado y su historial; reinscribir a la misma cuenta permite recuperar el resultado existente.

## Datos y concurrencia

- `courses.outcomesEnabled`: habilitación administrativa protegida también en las reglas de PocketBase.
- `course_outcomes`: un resultado por curso y alumno, con borrador y snapshot publicado separados.
- `course_outcome_history`: cada guardado, publicación y retiro, con autor, fecha y snapshots. El nombre del autor se conserva aunque posteriormente cambie su perfil.

Las dos colecciones son privadas incluso para clientes normales de administración. Todas las lecturas y escrituras pasan por el servidor autorizado. La versión esperada y una revisión consumida única en el historial impiden sobrescrituras silenciosas: resultado e historial se confirman en un único lote transaccional. Ante conflicto, se conservan los valores del editor y se pide actualizar antes de reintentar.

## Instalación y validación

Ejecutar `npm run schema:outcomes` con las credenciales de servicio del proyecto en `.env.local`. El script comprueba salud, crea un respaldo en `backups/pocketbase/`, aplica una migración aditiva e idempotente y verifica que los cursos y su habilitación no cambien. Requiere lotes habilitados con al menos dos operaciones. Aplicar el esquema antes de desplegar la aplicación.

```text
npm run schema:outcomes:test
npx vitest run lib/course-outcomes.test.ts lib/course-outcome-service.test.ts components/outcomes/Outcomes.test.tsx lib/actions-courses.test.ts components/CourseForm.test.tsx
npm run test:outcomes:integration
```

La integración real crea cuentas y cursos temporales, prueba privacidad entre dos alumnos, permisos contextuales, notas opcionales, correcciones, concurrencia, deshabilitación y retiro de matrícula; elimina sus datos al finalizar. No se ejecuta en las pruebas habituales sin activación explícita.

Para el recorrido manual en navegador local (`127.0.0.1`), `node scripts/course-outcome-e2e-fixture.mjs create` crea dos alumnos y sesiones de administración y docencia. Los archivos de sesión quedan en `tmp/outcomes/` y nunca se versionan. Al terminar ejecutar `node scripts/course-outcome-e2e-fixture.mjs cleanup`; elimina exclusivamente los registros y credenciales creados por esa prueba.

Para revertir operativamente, deshabilitar la función en los cursos y conservar las colecciones; no borrar resultados ni historial.

## Verificación del cambio (30 de octubre de 2026)

- 86 pruebas de aplicación y regresión, 66 de esquema y 6 de integración real aprobadas.
- TypeScript y compilación de producción aprobados; rutas administrativas y docentes generadas correctamente.
- Lint de los 32 archivos de código nuevos o modificados: cero errores y cero advertencias. El lint global del proyecto ya presenta problemas en materiales y archivos temporales ajenos a este cambio.
- Recorrido en navegador con administración, docente y dos alumnos: habilitación opcional, borrador oculto, publicación con confirmación, resultado propio y ausencia de datos ajenos. Revisión visual móvil sin desbordamiento y listado docente en escritorio.
- Migración aplicada con respaldo. Comprobación final: ambas colecciones privadas, cero cursos habilitados y cero cursos temporales remanentes. Las cuentas y credenciales de prueba fueron eliminadas.
