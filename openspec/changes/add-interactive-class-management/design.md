## Context

Ver proposal.md para motivación y alcance. Existen opciones por curso, acciones autenticadas con cookie HttpOnly y migraciones PocketBase. No hay transporte de sesiones en vivo implementado.

## Goals / Non-Goals

**Goals:** preservar permisos contextuales y definir un contrato de materiales para preparación asistida desde archivos.

**Non-Goals:** editor visual completo, sitios externos arbitrarios, sesiones, presencia, respuestas persistentes, notas y despliegue de la aplicación.

## Decisions

- Colección `interactive_lessons`: course requerido e inmutable, class opcional, title, description de texto, status (`draft`/`ready`), material JSON opcional y fechas. Clase sin cascada; curso con cascada consistente con otros contenidos. Estado efectivo borrador si desaparece la asociación o el material deja de validar.
- Un material pertenece a un curso y se asocia a una clase a la vez; varias entradas pueden compartir clase. Las sesiones futuras tendrán copias versionadas del material y sus respuestas separadas.
- Contrato v1 estricto: hasta 80 pantallas y 200 KB; identificadores estables; tipos `content`, `multiple-choice`, `poll`, `short-answer`. Markdown sin HTML ejecutable. Opciones con ID y una solución solo para opción múltiple; texto breve hasta 2000 caracteres. Zod ya está instalado. Importación de archivo con ejemplo descargable y vista previa, sin editor JSON en el flujo docente.
- Acciones verifican sesión, asignación docente, habilitación, propiedad y clase. Reglas de colección repiten los límites de acceso; solo admin configura el curso. La biblioteca global filtra por asignación y habilitación. No usar cliente de servicio en acciones docentes.
- Reutilizar componentes de diseño existentes. No mostrar navegación estudiantil ni controles ficticios de inicio de sesión.
- Próxima etapa: inicio/cierre con código, matrícula validada, controlador docente, estado durable versionado, recuperación de pantalla al reconectar, presencia con expiración y respuestas idempotentes solo para consulta docente. Evaluar transporte compatible con hosting y cookie HttpOnly; probar 100 conexiones y respuestas simultáneas antes de afirmar capacidad.

## Risks / Trade-offs

- [JSON inválido escrito fuera de la app] → validar al guardar y renderizar; permitir reemplazo desde edición.
- [Migración ausente] → migrar antes de desplegar; no disfrazar errores de configuración de biblioteca vacía.
- [Clase eliminada] → conservar el material y exigir nueva asociación para prepararlo.
- [Experiencias personalizadas] → futuras extensiones con componentes registrados sin ejecutar código importado.

## Migration Plan

Agregar booleano opcional y colección con índices por curso y clase, preservando campos, índices y registros. Actualizar regla compartida de cursos para proteger el nuevo campo en migraciones anteriores. Verificar migración y permisos con pruebas, TypeScript y build. Aplicar y comprobar el esquema si hay configuración local disponible, sin habilitar cursos automáticamente. Reversión: deshabilitar la opción y conservar los datos.
