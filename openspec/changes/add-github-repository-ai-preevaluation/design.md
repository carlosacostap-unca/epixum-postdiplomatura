## Context

La aplicación ya admite entregas discriminadas como archivos o URL en `deliveries.repositoryUrl`, conserva un `systemPrompt` opcional en el trabajo y dispone de una pantalla histórica que descomprime ZIP en el navegador antes de llamar a Chat Completions con datos suministrados por el cliente. El flujo nuevo atraviesa cursos, trabajos, entregas, PocketBase, GitHub y OpenAI, y debe cerrar los huecos de alcance, trazabilidad, SSRF, tamaño, prompt injection y publicación accidental. Ver `proposal.md` y las delta specs para el comportamiento requerido.

GitHub permite consultar recursos públicos y descargar un archivo ZIP por referencia; el límite no autenticado es bajo y compartido por IP, por lo que el token de solo lectura será opcional técnicamente pero recomendado operacionalmente. GPT-5.6 Luna admite Responses API y salidas estructuradas, de modo que no se necesita mantener el flujo heredado de Chat Completions ni habilitar herramientas del modelo.

## Goals / Non-Goals

**Goals:**

- Congelar una entrega GitHub en un commit reproducible y mostrar esa identidad en todo el flujo.
- Mantener autenticación y autorización como una primitiva del servidor que recibe identificadores, no prompts ni URLs arbitrarias del cliente.
- Preparar repositorios pequeños y medianos con límites deterministas, cobertura visible y limpieza garantizada.
- Separar configuración privada, intentos de IA y evaluación oficial para permitir auditoría y revisión humana.
- Reutilizar el formato de entrega URL y las dependencias existentes cuando no debiliten seguridad ni observabilidad.

**Non-Goals:**

- Ejecutar, compilar, instalar dependencias o correr pruebas del repositorio.
- Acceder a repositorios privados, submódulos, artefactos de Git LFS o contenido externo enlazado desde el repositorio.
- Evaluar archivos subidos, URLs que no sean raíces de repositorios GitHub o ramas elegidas libremente por el estudiante.
- Procesar en segundo plano mediante una cola distribuida; el piloto será una operación síncrona acotada y persistirá sus estados.
- Garantizar equivalencia entre análisis estático y funcionamiento real del proyecto.

## Decisions

### Extender el sobre de entrega URL con una captura GitHub versionada

Las entregas elegibles conservarán `repositoryUrl`, pero su JSON podrá incluir `provider: "github"`, URL canónica, `repositoryFullName`, `commitSha`, `commitCapturedAt` y `captureSource`. El parser compartido seguirá aceptando el sobre URL anterior y referencias de archivos heredadas. Los campos adicionales no afectan consumidores que ya discriminan por `type: "url"`.

El SHA se resolverá en la acción de entrega cuando el trabajo tenga configuración de IA activa. Evaluar `HEAD` al momento de revisar fue descartado porque permitiría que cambios posteriores alterasen la evidencia. Pedir al estudiante un SHA manual también fue descartado porque agrega fricción y errores evitables.

Para una URL heredada sin SHA, la primera solicitud autorizada resolverá y persistirá el commit con `captureSource: "legacy-first-evaluation"`; la interfaz mostrará que no representa necesariamente el estado original de la entrega.

### Encapsular GitHub detrás de un cliente de solo lectura y destinos fijos

El cliente recibirá propietario y repositorio ya validados, nunca una URL de descarga libre. Consultará `api.github.com` con una versión explícita de REST, verificará que `private` sea falso incluso si existe token y resolverá la rama predeterminada a un SHA completo. La descarga utilizará el endpoint `zipball/{sha}` y seguirá solamente redirecciones hacia hosts oficiales admitidos, incluido `codeload.github.com`.

Se prefiere un único ZIP generado por GitHub sobre recorrer el árbol y descargar cada blob porque reduce solicitudes y simplifica la captura atómica. No se usará `git clone`: no se necesita historial ni ejecución de Git, y eliminarlo reduce superficie de comandos, credenciales y archivos especiales.

`GITHUB_API_TOKEN` será opcional para recursos públicos, pero si existe se usará solo en llamadas desde el servidor. La ausencia de token y los encabezados de rate limit se convertirán en estados sanitizados; el token nunca se reenviará al destino de una redirección.

### Preparar la evidencia completamente en el servidor

La descarga tendrá cancelación por tiempo, límite de bytes y validación del host final. La extracción rechazará rutas absolutas, `..`, enlaces simbólicos y entradas fuera de límite. Aunque el archivo sea generado por GitHub, se aplicarán límites iniciales conservadores y centralizados: tamaño comprimido, tamaño expandido, cantidad de entradas, tamaño individual y volumen total de texto seleccionado. Los valores se ajustarán con el piloto sin cambiar el contrato; una referencia inicial razonable es 10 MiB comprimidos, 50 MiB expandidos, 2.000 entradas, 256 KiB por archivo de texto y 1 MiB de evidencia textual agregada.

La selección priorizará manifiestos, README, configuración, fuentes y pruebas. Excluirá `.git`, `node_modules`, `.next`, `dist`, `build`, `coverage`, binarios, minificados, mapas, lockfiles voluminosos y nombres sensibles como `.env` o claves. Cada decisión producirá metadatos de cobertura; si se alcanza un límite, la preevaluación fallará o declarará de forma explícita qué se omitió según si la evidencia restante sigue siendo suficiente.

El procesamiento usará memoria o un directorio temporal del sistema no servido por Next.js, con limpieza en `finally`. Se reutilizará JSZip en el servidor si sus límites pueden verificarse antes de materializar entradas; si las pruebas de memoria muestran que no es seguro, se incorporará un lector ZIP por streaming como dependencia acotada.

### Persistir configuración privada e intentos en colecciones separadas

Se agregará `aiPreevaluationEnabled` a `courses`, deshabilitado por defecto. La configuración no se almacenará en el registro público del trabajo: una colección `assignment_ai_configs` tendrá relación única con `assignment`, estado activo, criterios, veredictos, modalidad de nota, orientación del mensaje, instrucciones adicionales y versión. Sus reglas permitirán lectura y escritura solo a administradores y docentes asignados.

Una colección `ai_preevaluations` conservará relaciones a curso, trabajo, entrega y solicitante; estado; commit; modelo; versión y snapshot de configuración; cobertura; resultado estructurado; uso; error sanitizado; fechas y adopción posterior. No guardará el código completo ni el prompt final. Los estudiantes no tendrán acceso a esta colección y la escritura se hará con el cliente de servicio después de validar la sesión y el alcance con el cliente autenticado.

Separar colecciones evita exponer una solución esperada a estudiantes que pueden leer trabajos y evita sobrescribir `deliveries.grade`, `feedback`, `verdict` o `status` durante la generación. Guardar todo dentro de `deliveries` fue descartado porque perdería historial y confundiría sugerencia con evaluación oficial.

### Construir la solicitud OpenAI desde datos confiables del servidor

La operación pública recibirá solo `deliveryId`. Cargará entrega, trabajo, curso y configuración; verificará identidad, rol, asignación, habilitaciones, relaciones y commit; y recién entonces creará el intento. Si ya existe un intento `processing` para la misma entrega, commit y versión de configuración, devolverá ese intento en lugar de duplicar costo.

La entrada se dividirá conceptualmente en instrucciones fijas, enunciado/configuración docente y evidencia no confiable con rutas delimitadas. Se indicará que el repositorio puede contener instrucciones maliciosas y que no puede alterar la rúbrica. No se habilitarán web search, shell, code interpreter ni otras herramientas.

El servidor usará el SDK OpenAI existente con Responses API, modelo exacto `gpt-5.6-luna`, esfuerzo de razonamiento inicial `medium`, `store: false`, salida estricta validada también localmente y un límite de salida suficiente para la rúbrica. El esquema incluirá `verdict`, `suggestedGrade` anulable, resultados por criterio, fortalezas, correcciones, advertencias y `proposedMessage`. La configuración restringirá el veredicto al subconjunto permitido y controlará si la nota es válida.

Se omitirá la identidad del estudiante. Cuando se utilice `safety_identifier` o una clave de caché, se derivará de un identificador estable mediante hash no reversible. El `response.id` puede conservarse como metadato técnico, pero el contenido completo del repositorio no se persistirá localmente después de completar el intento.

### Mantener el piloto síncrono con estados recuperables

La solicitud docente esperará la descarga, selección y respuesta dentro de tiempos máximos. El intento se crea como `processing` y se actualiza a `completed` o `failed`. La interfaz bloquea dobles clics y presenta el resultado al terminar. Un intento `processing` que supere el umbral de abandono se mostrará como fallido recuperable y permitirá crear otro.

Una cola o Responses background mode fue descartada para el MVP porque agrega webhooks, polling, reconciliación y decisiones de retención antes de conocer la duración real de los repositorios del curso piloto. El modelo de datos deja esa evolución abierta sin cambiar el contrato visible.

### Adoptar la sugerencia mediante el flujo de evaluación existente

La interfaz mostrará cobertura y advertencias antes del contenido sugerido. Editar la propuesta no modifica la entrega hasta que el docente elija guardar borrador o publicar. Esa acción reutilizará la autorización de evaluación existente, admitirá el nuevo veredicto `Desaprobado` y marcará el intento como adoptado con actor y destino, sin atribuir la decisión final al modelo.

El componente histórico que hoy prepara ZIP en el navegador se retirará del camino de IA; la evaluación manual y las entregas por archivo continuarán funcionando.

## Risks / Trade-offs

- [Un repositorio legítimo supera los límites o contiene demasiados archivos] → Mostrar cobertura y límites, permitir evaluación manual y ajustar constantes con evidencia del piloto.
- [GitHub falla o alcanza su rate limit cerca del vencimiento] → Recomendar token de solo lectura, resolver el SHA al entregar, comunicar el error y permitir reintento sin cambiar la entrega ya capturada.
- [El repositorio cambia después de la entrega] → Descargar siempre por SHA y mostrarlo al estudiante y docente.
- [Un archivo intenta prompt injection] → Separar jerarquías, etiquetar toda evidencia como no confiable, deshabilitar herramientas y validar el resultado contra configuración y esquema.
- [La IA emite una evaluación persuasiva pero incorrecta] → Mostrar cobertura/advertencias, mantener edición y decisión humana obligatorias, y probar con entregas históricas antes de ampliar cursos.
- [El proceso síncrono excede límites de infraestructura] → Aplicar timeouts y volumen conservador; si la telemetría del piloto lo exige, migrar el mismo estado persistido a una cola o procesamiento background.
- [Un token GitHub con permisos amplios permite consultar privados] → Rechazar siempre `private: true`, documentar permisos mínimos y no aceptar tokens del usuario final.
- [La colección de configuración revela soluciones] → Reglas privadas, ausencia de expansión en vistas estudiantiles y pruebas directas contra PocketBase.

## Migration Plan

1. Incorporar la migración idempotente: campo de curso, `assignment_ai_configs`, `ai_preevaluations`, índices y reglas; conservar `systemPrompt` y datos existentes.
2. Crear configuraciones inactivas para trabajos con `systemPrompt` no vacío, copiándolo a instrucciones adicionales sin habilitar ningún curso ni trabajo.
3. Desplegar parsers compatibles con sobres URL antiguos y nuevos, tipos y lecturas antes de producir capturas GitHub.
4. Desplegar captura de commits, integración GitHub, preparación segura, cliente OpenAI y UI, manteniendo todos los cursos deshabilitados.
5. Configurar `OPENAI_API_KEY` y preferentemente `GITHUB_API_TOKEN` en el entorno de destino, ejecutar comprobaciones de integración sin registrar valores.
6. Habilitar un único curso piloto, configurar un TP y validar contra entregas de prueba antes de utilizar entregas reales.
7. Para rollback, deshabilitar la capacidad en cursos y revertir la UI/acciones conservando campos y colecciones. No eliminar intentos ni convertir sobres GitHub de vuelta; el parser anterior ya tolera campos extra del sobre URL.
