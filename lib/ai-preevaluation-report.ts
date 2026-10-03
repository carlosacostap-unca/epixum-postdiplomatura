import type { AICriterionResult, AIEvaluationCriterion, AIPreevaluationResult, RepositoryCoverage } from '@/types';

export interface AIPreevaluationReportInput {
  result: AIPreevaluationResult;
  commitSha: string;
  configVersion: number;
  rubric?: AIEvaluationCriterion[];
  coverage?: RepositoryCoverage;
}

const outcomes: Record<AICriterionResult['outcome'], string> = {
  cumple: 'Cumple',
  parcial: 'Cumple parcialmente',
  no_cumple: 'No cumple',
  no_verificable: 'No verificable con la evidencia disponible',
};

/** Publica justificaciones explícitas, no el intento privado ni razonamiento interno. */
export function buildAIPreevaluationFeedback(input: AIPreevaluationReportInput): string {
  const { result, coverage } = input;
  const rubric = new Map(input.rubric?.map((criterion) => [criterion.id, criterion]));
  const sections = [
    result.proposedMessage.trim(),
    'INFORME DETALLADO DE LA EVALUACIÓN',
    [
      'Alcance y método',
      `Commit analizado: ${input.commitSha}`,
      `Versión de la rúbrica: ${input.configVersion}`,
      `Sugerencia inicial de la preevaluación: ${result.verdict}. Nota sugerida: ${result.suggestedGrade === null ? 'sin nota numérica' : result.suggestedGrade}.`,
      'La preevaluación asistida por IA analiza de forma estática el código y la documentación seleccionados del commit entregado y los contrasta con el enunciado y la rúbrica docente. No ejecuta, compila ni prueba la aplicación.',
      'Las observaciones que siguen son las justificaciones registradas por criterio. La nota y el veredicto oficiales son los confirmados por el docente; no se inventan puntajes por criterio ni pasos internos del modelo.',
    ].join('\n'),
    'RESULTADOS POR CRITERIO',
  ];

  for (const [index, criterion] of result.criteria.entries()) {
    const configured = rubric.get(criterion.criterionId);
    sections.push([
      `${index + 1}. ${criterion.criterion}`,
      ...(configured ? [`Qué se evalúa: ${configured.description}`] : []),
      ...(typeof configured?.weight === 'number' ? [`Peso en la rúbrica: ${configured.weight}% (no es el puntaje obtenido).`] : []),
      `Resultado: ${outcomes[criterion.outcome]}`,
      `Observaciones: ${criterion.observation}`,
    ].join('\n'));
  }

  if (!input.rubric?.length) {
    sections.push('La descripción y los pesos de la rúbrica histórica no están disponibles en este registro. Se muestran los resultados por criterio conservados.');
  }

  for (const [title, items, empty] of [
    ['FORTALEZAS', result.strengths, 'No se registraron fortalezas adicionales.'],
    [result.verdict === 'Aprobado' ? 'MEJORAS RECOMENDADAS' : 'CORRECCIONES Y MEJORAS', result.corrections, 'No se registraron correcciones adicionales.'],
    ['ADVERTENCIAS Y LIMITACIONES', result.warnings, 'No se registraron advertencias adicionales.'],
  ] as const) {
    sections.push(`${title}\n${items.length ? items.map((item) => `- ${item}`).join('\n') : empty}`);
  }
  if (result.verdict === 'Aprobado' && result.corrections.length) {
    sections.push('Estas mejoras acompañan la aprobación sugerida; no implican un pedido de reenvío. El docente debe revisar esta indicación si modifica el veredicto.');
  }

  if (coverage) {
    sections.push([
      'COBERTURA DEL ANÁLISIS',
      `Archivos incluidos: ${coverage.includedFiles.length}. Archivos omitidos: ${coverage.omittedFiles.length}. Texto analizado: ${coverage.includedBytes} bytes.`,
      'Archivos incluidos:',
      ...(coverage.includedFiles.length ? coverage.includedFiles.map((path) => `- ${path}`) : ['No se registraron archivos incluidos.']),
      'Archivos omitidos y motivos:',
      ...(coverage.omittedFiles.length ? coverage.omittedFiles.map((file) => `- ${file.path}: ${file.reason}`) : ['No se registraron omisiones.']),
      'Un archivo omitido del análisis no equivale a un archivo faltante en el repositorio. Los aspectos que dependan de evidencia no disponible requieren revisión docente; no se debe atribuir esa limitación al estudiante.',
    ].join('\n'));
  } else {
    sections.push('COBERTURA DEL ANÁLISIS\nNo está disponible el detalle de archivos incluidos y omitidos para esta preevaluación. No se infiere que falten archivos del trabajo.');
  }

  return sections.join('\n\n');
}
