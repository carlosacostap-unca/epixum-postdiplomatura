# Auditoría de uso de roles

Fecha inicial: 3 de septiembre de 2026.

## Clasificación

| Categoría | Fuente autorizante | Usos principales encontrados |
|---|---|---|
| Privilegio global | `users.role === "admin"` | Layout y acciones administrativas, gestión de usuarios, cursos, invitaciones y excepciones administrativas de reglas PocketBase. |
| Docencia contextual | `courses.teachers` contiene la identidad | Layout y páginas docentes; clases, semanas, contenidos, recursos, trabajos, entregas, evaluaciones, consultas y preevaluación con IA. |
| Estudio contextual | `course_enrollments(course, student)` | Cursos estudiantiles, clases, contenidos, trabajos, entregas, consultas, matrícula por clave e invitación. |
| Presentación y navegación | Espacio activo y relación con el curso mostrado | Shell, ruta raíz, destinos genéricos, perfil, contadores administrativos y distintivos de autores. |
| Compatibilidad OAuth | `users.role` inicial `estudiante` | Alta inicial y prevención de escalada; no debe autorizar ni impedir participaciones por curso. |

## Hallazgos que deben corregirse

- Los layouts de docencia y estudio bloquean por el valor global antes de consultar relaciones.
- La matrícula por clave e invitación exige globalmente `estudiante`.
- Acciones de clases, contenidos, recursos, trabajos, entregas, consultas y preevaluación repiten guardas globales.
- El shell y las rutas genéricas seleccionan un único destino desde `users.role`.
- La selección administrativa de docentes excluye cuentas cuyo valor global es `estudiante`.
- La administración de usuarios presenta `docente` y `estudiante` como estados globales excluyentes.
- Varias reglas versionadas de PocketBase combinan relaciones correctas con condiciones globales redundantes.
- Los distintivos de autor en consultas infieren docencia desde el usuario y no desde el curso de la conversación.

## Criterio de cierre

La implementación no está completa mientras un valor global `docente` o `estudiante` pueda conceder acceso a un curso, impedir una participación válida en otro curso o etiquetar a una persona fuera del contexto correspondiente. `admin` continúa siendo el único privilegio global.
