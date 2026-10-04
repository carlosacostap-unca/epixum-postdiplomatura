# Piloto de preevaluación de repositorios GitHub con IA

## Alcance

El piloto analiza únicamente URLs raíz HTTPS de repositorios públicos de GitHub. El servidor fija un commit, descarga el ZIP de ese SHA, selecciona texto y código y lo envía a OpenAI sin ejecutar, compilar, instalar dependencias ni correr pruebas del repositorio. La salida es siempre una sugerencia privada para el docente.

## Variables privadas

Configurar en el entorno de ejecución, nunca en variables `NEXT_PUBLIC_*` ni en archivos versionados:

```dotenv
OPENAI_API_KEY=
GITHUB_API_TOKEN=
```

- `OPENAI_API_KEY` es obligatoria para solicitar una preevaluación.
- `GITHUB_API_TOKEN` es opcional para repositorios públicos, pero recomendado para evitar el límite compartido no autenticado. Usar un token de solo lectura con el mínimo acceso a metadatos y contenidos públicos. La aplicación rechaza repositorios privados aunque el token permita verlos.
- Rotar o revocar cualquier credencial que haya sido expuesta. La UI solo recibe indicadores booleanos de disponibilidad, nunca los valores.

## Límites iniciales

- Descarga comprimida: 10 MiB.
- Contenido expandido declarado: 50 MiB.
- Entradas ZIP: 2.000.
- Archivo de texto individual: 256 KiB.
- Evidencia textual agregada: 1 MiB.
- Metadata GitHub: 10 segundos; descarga: 30 segundos; OpenAI: 60 segundos con un reintento transitorio del SDK.

Se excluyen secretos, `.env`, claves, binarios, dependencias, directorios generados, mapas, archivos minificados y lockfiles voluminosos. Toda omisión se presenta como cobertura al docente.

### Vistas EJS

El selector compartido admite archivos `.ejs` en cualquier ruta del proyecto, incluidos layouts, parciales y vistas anidadas. Se envía su contenido literal como evidencia no confiable: no se renderizan plantillas ni se ejecutan sus expresiones JavaScript. Esto permite analizar formularios, navegación, accesibilidad, interpolación y uso de layouts/includes cuando la rúbrica los requiere, como en los TP4 y TP5 de Desarrollo Back End con Node.js (Cohorte 6).

Las vistas conservan los mismos límites de tamaño y exclusiones de secretos, dependencias y directorios generados que el resto de las fuentes. Si un archivo aparece en la cobertura como omitido, esa ausencia en la evidencia no demuestra que falte en el repositorio.

Los intentos guardados antes de este ajuste conservan su resultado y cobertura originales. Para incluir las vistas en una entrega ya preevaluada, una vez desplegado el cambio se debe solicitar una nueva preevaluación del commit capturado y revisar su resultado antes de publicar; no se modifican automáticamente las notas ni las devoluciones anteriores.

## Preparación del esquema

```powershell
npm.cmd run schema:ai-preevaluation
npm.cmd run schema:test
npm.cmd run schema:ai-preevaluation:verify
```

La migración es idempotente. Agrega la habilitación por curso y las colecciones privadas `assignment_ai_configs` y `ai_preevaluations`. Los `systemPrompt` heredados se copian a configuraciones inactivas y ningún curso se habilita automáticamente.

## Procedimiento del curso piloto

1. Configurar los proveedores y aplicar/verificar el esquema.
2. Ejecutar pruebas, TypeScript y build.
3. Como administrador, habilitar IA en un único curso de prueba.
4. Como docente asignado, configurar un TP con rúbrica, requisitos y veredictos; mantenerlo inactivo hasta completar la configuración.
5. Entregar un repositorio público fixture y confirmar que la vista estudiantil muestre repositorio y SHA.
6. Solicitar una preevaluación de prueba; revisar commit, cobertura, advertencias y todos los criterios.
7. Editar la propuesta y guardarla como borrador. Publicar solo después de una revisión docente independiente.
8. Validar con entregas históricas anonimizadas o fixtures antes de habilitar entregas reales.

## Publicación del informe completo

Las nuevas sugerencias preparan por defecto en el campo **Devolución para el estudiante** el mensaje y un informe completo: alcance estático, commit, versión de rúbrica, resultados y observaciones de todos los criterios, descripción y peso disponibles en la rúbrica histórica, fortalezas, correcciones o recomendaciones, advertencias y cobertura de archivos incluidos/omitidos. No se inventan puntajes por criterio ni se publica un registro de razonamiento interno de la IA.

El docente puede editar todo el texto, guardar un borrador y confirmar su publicación. Debe revisar su coherencia con la nota y el veredicto elegidos, especialmente si cambia la sugerencia original. Las recomendaciones de un trabajo aprobado no se presentan como condiciones de reenvío.

El texto confirmado se persiste íntegramente en `deliveries.feedback`, se muestra como devolución publicada y se conserva en el historial de la versión cuando el alumno reenvía. No cambia el esquema ni los permisos de la colección privada `ai_preevaluations`, ni se publican sus metadatos administrativos o uso del proveedor. La lectura estudiantil usa la devolución de su propia entrega por el flujo existente.

Al abrir una evaluación o borrador guardado se conserva su texto; no se amplían devoluciones antiguas automáticamente. Solicitar explícitamente una nueva preevaluación sí genera una nueva propuesta completa, que debe revisarse antes de publicar. La evaluación manual sigue disponible sin informe generado. Para procesos por lotes autorizados, componer también el texto con `buildAIPreevaluationFeedback` antes de usar la operación de publicación, en lugar de enviar sólo `result.proposedMessage`.

## Smoke tests opt-in

No forman parte de la suite habitual y no deben utilizar contenido real de estudiantes.

```powershell
$env:RUN_GITHUB_AI_SMOKE="1"
npx.cmd vitest run lib/github-preevaluation.smoke.test.ts

$env:RUN_OPENAI_AI_SMOKE="1"
npx.cmd vitest run lib/openai-preevaluation.smoke.test.ts
```

El smoke de GitHub usa `octocat/Spoon-Knife`, un fixture público pequeño con código, y no invoca OpenAI. El smoke de OpenAI usa evidencia mínima sintética y se omite si no existe `OPENAI_API_KEY`.

## Resultado técnico previo al piloto real

Registrar aquí, en cada despliegue candidato, fecha, commit de Epixum, resultado de migración/acceso, suite, build y ambos smoke tests. Los smoke tests externos pendientes o fallidos impiden habilitar el curso real, pero no modifican entregas ni evaluaciones existentes.

### Validación local del 22 de agosto de 2026

- Base de código: `4952551` más el cambio local `add-github-repository-ai-preevaluation`.
- Suite UI/unitaria: 161 aprobadas; 2 smoke tests externos omitidos por diseño.
- Esquema/fixtures: 16 aprobadas, incluida idempotencia, conservación y reglas privadas de IA.
- ESLint y TypeScript: sin errores ni advertencias.
- `next build`: compilación y generación de rutas completadas correctamente con Next.js 16.3.0.
- Configuración detectada sin revelar valores: PocketBase disponible; `OPENAI_API_KEY` y `GITHUB_API_TOKEN` todavía ausentes.
- Migración y verificador contra la instancia PocketBase real: pendientes de ejecución deliberada antes del piloto.
- Smoke GitHub y OpenAI: pendientes hasta habilitar explícitamente las variables de ejecución; no se utilizó contenido de estudiantes.

### Validación técnica del 29 de agosto de 2026

- Base de código: `4952551` más el cambio local `add-github-repository-ai-preevaluation`.
- Configuración detectada sin revelar valores: PocketBase, `OPENAI_API_KEY` y `GITHUB_API_TOKEN` disponibles.
- Smoke GitHub: aprobado con `octocat/Spoon-Knife`; se capturó el SHA, se descargó el ZIP por commit y se generó cobertura sin invocar OpenAI.
- Smoke OpenAI: aprobado con evidencia sintética mínima, `gpt-5.6-luna`, razonamiento `medium` y salida estructurada; no se utilizó contenido de estudiantes.
- Migración PocketBase: aplicada correctamente de forma idempotente; no se habilitó ningún curso y no había prompts heredados adicionales por migrar.
- Verificación de acceso PocketBase: aprobada para administrador, docente asignado, docente ajeno, estudiante y cliente anónimo; los intentos admiten escritura únicamente mediante el cliente de servicio.
- Esquema/fixtures: 16 pruebas aprobadas, incluida idempotencia y materialización de campos de auditoría antes de crear índices.
- Suite UI/unitaria: 162 pruebas aprobadas; 2 smoke tests externos omitidos por diseño en la suite habitual.
- ESLint, TypeScript y `next build`: completados sin errores.
- OpenSpec: `add-github-repository-ai-preevaluation` válido en modo estricto.
- Curso piloto habilitado: `Desarrollo Back End con Node.js (Cohorte 6)`; todos los demás cursos permanecen deshabilitados.
- TP piloto activo: `Trabajo Práctico Semana 1` (`wk1moryv4oo4ggc`), configuración versión 4 con seis criterios ponderados, diez controles obligatorios, veredictos `Aprobado`, `Desaprobado` y `Corregir y reenviar`, y escala de 0 a 10 con umbral obligatorio de aprobación de 6 puntos.
- La versión 4 redacta `proposedMessage` como una devolución final dirigida directamente al alumno, lista para que el docente la edite o publique, sin referencias a la IA ni instrucciones internas. La nota se determina exclusivamente mediante análisis estático: no se reservan ni descuentan puntos por falta de ejecución manual y solo se penalizan defectos o incumplimientos observables en el repositorio.
- La evaluación utiliza un criterio formativo y flexible: reconoce avances parciales, soluciones técnicamente equivalentes y diferencias menores que no afecten el objetivo de aprendizaje. Toda nota igual o superior a 6 debe producir el veredicto `Aprobado`; las mejoras pendientes se comunican como recomendaciones y no como condiciones de aprobación.
- El enunciado del TP se incorporó a su descripción para que forme parte del contexto confiable enviado al modelo. Las 64 entregas existentes son URLs raíz de GitHub heredadas sin SHA; el primer intento autorizado fijará el commit vigente y mostrará al docente la advertencia `legacy-first-evaluation`.
- Segundo TP piloto activo: `Trabajo Práctico Semana 2` (`9sb2ycz0cietqgu`), configuración versión 1 con siete criterios ponderados según el enunciado, trece controles obligatorios, escala de 0 a 10 y los tres veredictos. La regla de aprobación es obligatoria desde 6 puntos, con análisis estático, crédito parcial, soluciones equivalentes y devolución final dirigida al alumno.
- El enunciado de `Módulos, asincronía y NPM` se incorporó a la descripción del TP2 y se adaptó al alcance del piloto, que requiere un repositorio público de GitHub. Sus tres entregas existentes se conservan como heredadas; el primer intento fijará el commit vigente y advertirá `legacy-first-evaluation`.

### Configuración de la Unidad 6 — 3 de octubre de 2026

- Curso: `Desarrollo Back End con Node.js (Cohorte 6)` (`szd5mys6jjhfzzn`).
- Práctico: `Trabajo Práctico Unidad 6` (`f62ua39aq6y52ji`), **Refactorización modular de reservas**.
- Configuración activa versión 1: `btrs3u4hyzqz8dl`. Copia reproducible en [unidad-06-config.json](./unidad-06-config.json).
- Siete criterios según el PDF, con pesos 20, 10, 10, 25, 10, 10 y 15%; equivalentes a 2, 1, 1, 2.5, 1, 1 y 1.5 puntos sobre 10. Incluye 26 controles.
- Escala 0–10, aprobación obligatoria desde 6; por debajo de 6, `Corregir y reenviar`. `Desaprobado` no está permitido. Valoración flexible y proporcional, sin duplicar descuentos por un mismo defecto.
- Análisis estático del commit, incluyendo EJS, layout, CSS, módulos, instancia compartida del servicio, pipeline, validación, entorno y scripts. No se ejecuta código ni se descuentan puntos por falta de pruebas del evaluador. Se distingue documentación obligatoria ausente de limitaciones de cobertura; `.env.example`, `.gitignore` y lockfiles omitidos no prueban ausencia ni se penalizan por esa limitación.
- El enunciado completo del PDF se incorporó a `assignments.description`, porque el proveedor recibe esa descripción y no lee automáticamente archivos adjuntos. Transcripción local en [unidad-06-enunciado.md](./unidad-06-enunciado.md). PDF del almacenamiento verificado contra la copia local: SHA-256 `f5599832dc0abdf5d53aa05afe6ad9aff69113185be70f85f6e641a98e413d1c`.
- La devolución exige evidencia y observaciones para los siete criterios, fortalezas, correcciones/recomendaciones y advertencias, más mensaje editable dirigido al estudiante. El informe completo se publica por el flujo descrito arriba; no se solicita razonamiento interno del modelo.
- Validación: esquema real `assignmentAIConfigInputSchema`, pesos sumados a 100%, lectura posterior de configuración y enunciado iguales al contenido preparado. Las tres entregas conservaron exactamente sus registros. No se invocó OpenAI, no se preevaluaron alumnos ni se enviaron devoluciones.
- Compatibilidad local: 22 pruebas aprobadas en los cuatro archivos de esquema, prompt, informe e ingestión GitHub; el proceso de prueba no utilizó repositorios de alumnos ni invocó OpenAI.
- Esta operación sólo configura la Unidad 6 y documenta lo guardado; no despliega código ni hace push a GitHub. La aplicación utiliza la configuración almacenada en PocketBase sin requerir un nuevo despliegue para estos datos; EJS e informe completo dependen del despliegue del código que los incorpora.
