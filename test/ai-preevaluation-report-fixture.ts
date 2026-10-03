import type { AIPreevaluationReportInput } from '@/lib/ai-preevaluation-report';

export const reportFixture: AIPreevaluationReportInput = {
  commitSha: 'a'.repeat(40), configVersion: 2,
  rubric: [{ id: 'vistas', title: 'Vistas', description: 'Layout, formularios y accesibilidad.', weight: 40 }],
  result: {
    verdict: 'Corregir y reenviar', suggestedGrade: 5,
    proposedMessage: 'Corregir y reenviar — 5/10. Revisá el formulario.',
    criteria: [
      { criterionId: 'vistas', criterion: 'Vistas', outcome: 'parcial', observation: 'En views/nueva.ejs falta asociar el label al input.' },
      { criterionId: 'api', criterion: 'API', outcome: 'cumple', observation: 'Se verifica la validación del servidor.' },
      { criterionId: 'errores', criterion: 'Errores', outcome: 'no_cumple', observation: 'No se observa una respuesta 400.' },
      { criterionId: 'layout', criterion: 'Layout', outcome: 'no_verificable', observation: 'La evidencia del layout está incompleta.' },
    ],
    strengths: ['Validación clara.', 'Buenas rutas.'],
    corrections: ['Asociar label e input.', 'Conservar los valores.'],
    warnings: ['No se ejecutó la aplicación.', 'Verificar cobertura.'],
  },
  coverage: { commitSha: 'a'.repeat(40), includedFiles: ['src/index.js', 'views/nueva.ejs'], omittedFiles: [{ path: 'views/layout.ejs', reason: 'archivo de texto fuera de límite' }], includedBytes: 200, expandedBytes: 300, totalEntries: 3, partial: true },
};
