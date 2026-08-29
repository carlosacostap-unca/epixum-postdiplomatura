## 1. Esquema y tipos persistentes

- [x] 1.1 Extender los tipos de curso y entrega con la habilitación administrativa y el sobre GitHub versionado, conservando el parseo de archivos, URL genéricas y referencias heredadas.
- [x] 1.2 Definir tipos y validadores compartidos para configuración de TP, criterios, veredictos, cobertura, resultado estructurado, estados y errores de preevaluación.
- [x] 1.3 Implementar la migración idempotente de PocketBase para `courses.aiPreevaluationEnabled`, `assignment_ai_configs`, `ai_preevaluations`, relaciones, índices y reglas privadas.
- [x] 1.4 Migrar `systemPrompt` no vacío a configuraciones inactivas como instrucciones adicionales sin habilitar cursos ni trabajos y sin eliminar el campo heredado.
- [x] 1.5 Agregar pruebas de esquema para primera ejecución, repetición, valores por defecto, unicidad por trabajo, cascadas y conservación de entregas/evaluaciones existentes.
- [x] 1.6 Agregar una verificación de acceso real o fixture equivalente que cubra administrador, docente asignado, docente ajeno, estudiante y cliente no autenticado sobre ambas colecciones nuevas.

## 2. Ingesta segura de repositorios GitHub

- [x] 2.1 Implementar y probar el parser estricto de URLs raíz HTTPS de GitHub, normalización de `.git` y `/`, y rechazo de hosts, credenciales, parámetros, fragmentos y rutas no elegibles.
- [x] 2.2 Implementar el cliente GitHub de servidor para consultar repositorios públicos, rechazar privados, resolver rama predeterminada y obtener un SHA completo con timeout y errores tipados.
- [x] 2.3 Implementar la descarga `zipball` por SHA con control manual de redirecciones, allowlist de hosts oficiales, cancelación, límite de bytes y token opcional que no se propaga al host de descarga.
- [x] 2.4 Implementar la extracción defensiva sin rutas absolutas, traversal ni enlaces, con límites de archivo, expansión, entradas y memoria, y limpieza garantizada de temporales.
- [x] 2.5 Implementar la selección de fuentes, manifiestos, configuración, README y pruebas, excluyendo secretos, binarios, dependencias, generados, minificados y contenido fuera de límites.
- [x] 2.6 Generar cobertura determinista con commit, archivos incluidos y omitidos, bytes y motivos, y rechazar evidencia insuficiente antes de llamar a OpenAI.
- [x] 2.7 Cubrir con pruebas unitarias y fetch simulado repositorio privado/inexistente, rate limit, timeout, redirección hostil, ZIP fuera de límite, zip-slip, secretos, proyecto vacío y selección válida.

## 3. Habilitación y configuración pedagógica

- [x] 3.1 Incorporar el control administrativo por curso en creación y edición, validando rol en la acción y dejando el valor deshabilitado por defecto.
- [x] 3.2 Implementar lecturas y mutaciones de `assignment_ai_configs` con validación de curso habilitado, docente asignado, criterios, veredictos, nota opcional y versión de configuración.
- [x] 3.3 Crear la interfaz docente de configuración del TP con activación, rúbrica, requisitos, veredictos, escala opcional, orientación del mensaje e instrucciones adicionales.
- [x] 3.4 Mostrar la configuración como conservada pero inactiva cuando el administrador deshabilita el curso, sin exponerla en páginas ni respuestas estudiantiles.
- [x] 3.5 Agregar pruebas de acciones y componentes para administrador, docente propio/ajeno, validación incompleta, activación y deshabilitación posterior.

## 4. Captura inmutable al entregar

- [x] 4.1 Integrar la resolución GitHub en la creación y actualización de entregas URL cuando el curso y TP estén activos, persistiendo URL canónica, repositorio, SHA, fecha y origen de captura.
- [x] 4.2 Mantener sin cambios el flujo general para archivos y URL no elegibles, y devolver errores claros si un trabajo que exige captura GitHub no puede resolver el repositorio.
- [x] 4.3 Mostrar al estudiante el repositorio y SHA abreviado que quedaron entregados y volver a capturarlos únicamente ante una actualización válida antes del vencimiento.
- [x] 4.4 Implementar la captura tardía única de URL GitHub heredadas al primer intento y registrar `legacy-first-evaluation` para advertir al docente.
- [x] 4.5 Probar creación, actualización, vencimiento, commits posteriores, repositorio inválido, entrega heredada y compatibilidad de los sobres anteriores.

## 5. Orquestación de la preevaluación

- [x] 5.1 Reemplazar la acción que acepta prompts arbitrarios por una operación de servidor que recibe solo `deliveryId` y valida sesión, rol, asignación, relaciones, habilitaciones, configuración y commit antes de efectos externos.
- [x] 5.2 Implementar creación y transición de intentos `processing`, `completed` y `failed`, deduplicación de intentos activos equivalentes y recuperación de estados abandonados.
- [x] 5.3 Construir el input desde instrucciones fijas, enunciado, snapshot de configuración y evidencia delimitada como no confiable, omitiendo identidad y email del estudiante.
- [x] 5.4 Definir y validar localmente el esquema estricto de salida con veredicto permitido, nota anulable, criterios, fortalezas, correcciones, advertencias y mensaje propuesto.
- [x] 5.5 Migrar el proveedor a Responses API con modelo exacto `gpt-5.6-luna`, razonamiento `medium`, `store: false`, sin herramientas y con límites de entrada/salida.
- [x] 5.6 Implementar timeouts, reintentos transitorios acotados, interpretación de límites y sanitización de errores de GitHub y OpenAI sin registrar tokens, código o datos personales.
- [x] 5.7 Persistir modelo, configuración, commit, cobertura, resultado, uso y metadatos de adopción sin guardar el repositorio ni el prompt completo.
- [x] 5.8 Agregar pruebas que demuestren que solicitudes no autorizadas, cursos deshabilitados, relaciones cruzadas y contenido con prompt injection no producen llamadas externas ni alteran evaluaciones.

## 6. Experiencia docente y adopción humana

- [x] 6.1 Sustituir la preevaluación de ZIP preparada en el navegador por la tarjeta de repositorio GitHub en el detalle docente, preservando la evaluación manual para todas las modalidades.
- [x] 6.2 Mostrar elegibilidad, commit, origen de captura, estados, errores recuperables, cobertura y advertencias antes del resultado generado.
- [x] 6.3 Presentar veredicto, nota opcional, criterios, fortalezas, correcciones y mensaje propuesto como una sugerencia claramente diferenciada de la evaluación oficial.
- [x] 6.4 Permitir editar la sugerencia y adoptarla explícitamente como borrador o publicación mediante la acción de evaluación autorizada, marcando el intento como adoptado.
- [x] 6.5 Ampliar tipos, formularios y vistas de docente/estudiante para el veredicto `Desaprobado` y la ausencia legítima de nota.
- [x] 6.6 Ocultar la acción de IA para archivos, URL no GitHub, configuración incompleta, curso o TP deshabilitado y actores sin alcance, manteniendo acceso a la revisión manual.
- [x] 6.7 Agregar pruebas de componentes para estados de carga, fallo, reintento, cobertura parcial, edición, descarte, guardado borrador y publicación confirmada.

## 7. Operación, compatibilidad y validación

- [x] 7.1 Documentar `OPENAI_API_KEY`, el token opcional `GITHUB_API_TOKEN`, permisos mínimos, límites iniciales y procedimiento del curso piloto sin incluir valores reales.
- [x] 7.2 Incorporar una comprobación de configuración que informe disponibilidad de cada proveedor al servidor sin exponer secretos al cliente.
- [x] 7.3 Agregar un smoke test opt-in contra un repositorio público fixture que capture un SHA, descargue por commit y verifique cobertura sin invocar OpenAI en la suite habitual.
- [x] 7.4 Crear una prueba de integración OpenAI opt-in con evidencia mínima y salida estructurada, protegida para no ejecutarse sin clave ni publicar contenido real de estudiantes.
- [x] 7.5 Ejecutar pruebas de regresión de entregas por archivos, URL genéricas, vencimientos, alcance docente, evaluación manual y visibilidad estudiantil.
- [x] 7.6 Ejecutar pruebas unitarias/UI, pruebas de esquema y acceso, lint o TypeScript aplicable y `npm run build`, corrigiendo cualquier regresión.
- [x] 7.7 Ejecutar `openspec validate add-github-repository-ai-preevaluation --strict --no-interactive` y documentar el resultado del piloto técnico antes de habilitar un curso real.
