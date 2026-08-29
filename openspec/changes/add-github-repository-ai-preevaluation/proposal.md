## Why

El prototipo actual de preevaluación solo prepara entregas de archivos y no permite aplicar la IA de forma selectiva por curso ni analizar los repositorios públicos de GitHub que constituyen la modalidad real de entrega del curso piloto. Se necesita un flujo auditable que congele el commit entregado, analice el código sin ejecutarlo y mantenga al docente como responsable exclusivo de la evaluación publicada.

## What Changes

- Permitir que un administrador habilite o deshabilite la preevaluación asistida por IA por curso, deshabilitada por defecto.
- Permitir que un docente asignado habilite y configure por trabajo práctico una rúbrica, requisitos, veredictos, nota opcional, estilo del mensaje e instrucciones adicionales.
- Reconocer exclusivamente repositorios públicos de GitHub como fuente elegible para la preevaluación del MVP, normalizar su URL y congelar el SHA del commit asociado a la entrega.
- Descargar en el servidor un archivo del commit inmutable, extraerlo con límites defensivos y seleccionar solamente código y texto pertinentes sin ejecutar contenido del estudiante.
- Reemplazar la llamada actual basada en prompts arbitrarios del cliente por una operación que recibe identificadores, valida rol, alcance docente, curso, trabajo, entrega y configuración, y usa `gpt-5.6-luna` mediante Responses API con salida estructurada.
- Persistir cada intento de preevaluación y su cobertura, resultado, modelo, uso y configuración aplicada de forma separada a la evaluación oficial.
- Presentar al docente una sugerencia editable con veredicto, nota opcional, análisis por criterio y mensaje propuesto; la sugerencia MUST NOT publicarse automáticamente.
- Conservar las entregas existentes por archivos o por otras URL para sus flujos actuales, pero excluirlas de la preevaluación de este MVP.

## Capabilities

### New Capabilities

- `github-repository-ingestion`: validación de repositorios públicos de GitHub, captura del commit, descarga inmutable y preparación segura del código para análisis estático.

### Modified Capabilities

- `ai-preevaluation`: restringir la solicitud por habilitación y alcance, configurar la evaluación por trabajo, usar GPT-5.6 Luna con salida estructurada, persistir intentos y exigir revisión humana.
- `assignments-deliveries-and-evaluation`: identificar entregas elegibles de GitHub, congelar el commit y mostrar el flujo docente de preevaluación sin alterar la evaluación oficial hasta una acción explícita.
- `course-management-and-enrollment`: incorporar la habilitación administrativa de la capacidad de IA por curso con valor inicial deshabilitado.
- `pocketbase-data-and-security`: persistir la configuración y los intentos de preevaluación con reglas de acceso, trazabilidad y migración compatible.
- `runtime-and-integrations`: incorporar la integración de solo lectura con GitHub y mantener las credenciales de GitHub y OpenAI exclusivamente en el servidor.

## Impact

- Vistas administrativas de cursos, gestión docente de trabajos prácticos y detalle de entregas.
- Acciones de servidor, utilidades de entregas URL, cliente OpenAI y un nuevo módulo de integración con GitHub.
- Esquema de PocketBase para habilitación por curso, configuración por trabajo e historial de intentos; se requiere una migración idempotente que preserve todos los registros actuales.
- Variables de entorno `OPENAI_API_KEY` y, para operación estable frente a límites de GitHub, `GITHUB_API_TOKEN`, sin valores versionados.
- Dependencias de extracción de archivos y validación estructurada; no se incorpora ejecución de código ni acceso a repositorios privados.
- Compatibilidad: las entregas heredadas continúan legibles; las URL GitHub previas sin SHA se fijan al commit vigente al iniciar su primera preevaluación y se informa esa circunstancia al docente.
