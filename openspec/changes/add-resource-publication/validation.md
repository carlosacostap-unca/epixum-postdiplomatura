# Verificación

Fecha: 2026-10-05.

- 26 pruebas de acciones y componentes aprobadas: recursos, entregas, formulario y listado semanal.
- 47 pruebas de esquemas aprobadas, incluyendo conservación e idempotencia.
- `next build`, TypeScript y ESLint de todos los archivos del cambio aprobados.
- Validación OpenSpec estricta aprobada.
- El lint global encuentra errores anteriores en `materials/pensamiento-critico-ia/privado/guia-recurso.mjs` y `tmp/evaluar-pendientes-20261003.mjs`; no pertenecen al cambio.

La migración se aplicó con respaldo local ignorado por Git. Se verificó conservación de 14 trabajos prácticos y 254 recursos, sin reescritura de registros, y una segunda aplicación sin cambios de esquema. Las reglas se comprobaron contra PocketBase con cuentas temporales: estudiante matriculado, docente por relación, administrador y docente ajeno. Se verificaron listados, consulta directa, publicación y retorno a borrador, recursos dentro de un trabajo en borrador, visibilidad semanal, registros sin estado y rechazo de entregas a borradores. Las reglas de entrega ya bloqueadas al servicio permanecieron bloqueadas.

Navegador contra compilación local: acceso directo a TP borrador redirige al alumno; publicación desde formulario docente habilita TP y solo sus recursos publicados; creación de recurso de clase usa borrador; edición y publicación habilitan el recurso al alumno. Formularios revisados a 390 × 844, incluyendo edición modal. Las cuentas y materiales temporales se eliminan al finalizar.

# Operación

En instalaciones adicionales: ejecutar `npm run schema:publication` antes de desplegar esta versión. El script respalda esquema y registros bajo `backups/pocketbase/`; esos archivos deben permanecer privados. `npm run schema:publication:verify` prueba permisos con registros temporales y los limpia automáticamente.

El trabajo completo y cada adjunto tienen estados independientes. Los registros previos sin estado conservan visibilidad de publicados; nuevas altas desde la aplicación inician en borrador. Publicado sigue sujeto a matrícula y disponibilidad de la unidad. Bedeles asignados conservan acceso de supervisión de solo lectura. El cambio no incorpora estados a los contenidos independientes del curso.

Volver a borrador impide nuevas lecturas y firmas de descarga estudiantiles. No revoca copias descargadas, enlaces externos ni URLs S3 emitidas previamente (expiran según la configuración actual, una hora). Revertir reglas a la versión anterior puede volver visibles los borradores; mantener el campo preserva sus estados.

Aplicación implementada y verificada localmente; publicación de código y despliegue pendientes.
