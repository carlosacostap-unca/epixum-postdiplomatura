# Recursos solo para docentes

Los formularios de alta y edición de recursos de clases y trabajos prácticos incluyen **Disponible para**:

- **Docentes y alumnos:** los estudiantes matriculados acceden si el recurso, su clase o trabajo y su unidad están publicados o disponibles.
- **Solo docentes:** acceso reservado a los docentes asignados al curso y administración, también cuando el recurso está publicado. Otros docentes, alumnos y la vista de bedelía no acceden.

La audiencia es independiente del estado de publicación. Se pueden reservar solucionarios, guiones o materiales internos y cambiar su audiencia más adelante. Los listados de gestión identifican estos recursos con **Solo docentes**. Aplica a archivos y enlaces; los contenidos independientes mantienen su comportamiento actual.

`links.audience` es un select opcional con valores `everyone` y `teachers`. Un valor vacío conserva el acceso compartido de los recursos anteriores. Las altas nuevas son compartidas por defecto y las ediciones que omiten la audiencia la conservan.

Las reglas de lectura de PocketBase bloquean listados e IDs directos para alumnos. Las acciones de descarga comprueban la audiencia antes de firmar archivos. La vista de bedelía, que utiliza el cliente de servicio, también filtra recursos reservados y rechaza sus descargas. Ningún alumno puede modificar la audiencia de un recurso.

## Migración y validación

`npm run schema:publication` respalda el esquema y los registros, añade el campo e instala las reglas sin cambiar recursos existentes. Las migraciones de contenidos y roles también garantizan el campo y estas reglas. `npm run schema:publication:verify` verifica permisos reales con recursos temporales y los elimina al terminar.

La restricción impide nuevas lecturas y descargas desde Epixum. No cambia los permisos del sitio de un enlace externo ni revoca copias descargadas o URLs firmadas previamente.

## Validación del 13 de octubre de 2026

- 50 pruebas de aplicación y formularios; 48 pruebas de esquema.
- TypeScript, lint de los archivos modificados y compilación de producción correctos. La compilación requirió regenerar una caché local de Turbopack; no se cambió la configuración.
- Esquema aplicado con respaldo local. Se conservaron exactamente los 261 recursos y los estados de sus clases, trabajos y contenidos. Migración idempotente.
- Prueba real de PocketBase: enlaces y archivos docentes de clases y trabajos ocultos a alumnos en listados e IDs, acceso docente contextual y administrativo, rechazo de docentes ajenos y cambios de audiencia. Usuarios y recursos temporales eliminados.
- Pruebas de supervisión: ningún recurso docente se devuelve a la vista de bedelía ni genera una URL de descarga por esa vía.
