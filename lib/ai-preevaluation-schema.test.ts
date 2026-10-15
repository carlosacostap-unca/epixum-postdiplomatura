import { describe, expect, it } from 'vitest';
import { assignmentAIConfigInputSchema, validateAIResultForConfig } from './ai-preevaluation-schema';

const config = assignmentAIConfigInputSchema.parse({
  active: true,
  criteria: [{ id: 'c1', title: 'Código', description: 'Calidad', weight: null }],
  requiredChecks: [],
  allowedVerdicts: ['Aprobado', 'Desaprobado'],
  gradeEnabled: true,
  gradeMin: 0,
  gradeMax: 10,
  messageGuidance: '',
  additionalInstructions: '',
});

describe('contrato estructurado de IA', () => {
  it('admite mensaje breve por trabajo y conserva configuraciones históricas sin formato explícito', () => {
    expect(assignmentAIConfigInputSchema.parse(config).studentFeedbackMode).toBeUndefined();
    expect(assignmentAIConfigInputSchema.parse({ ...config, studentFeedbackMode: 'message_only' }).studentFeedbackMode).toBe('message_only');
    expect(assignmentAIConfigInputSchema.safeParse({ ...config, studentFeedbackMode: 'otro' }).success).toBe(false);
  });
  it('acepta todos los campos y criterios configurados', () => {
    expect(validateAIResultForConfig({ verdict: 'Aprobado', suggestedGrade: 8, criteria: [{ criterionId: 'c1', criterion: 'Código', outcome: 'cumple', observation: 'Bien' }], strengths: ['Legible'], corrections: [], warnings: [], proposedMessage: 'Buen trabajo' }, config)).toMatchObject({ suggestedGrade: 8 });
  });
  it('rechaza veredictos, escalas o criterios fuera de configuración', () => {
    expect(() => validateAIResultForConfig({ verdict: 'Corregir y reenviar', suggestedGrade: 11, criteria: [{ criterionId: 'otro', criterion: 'Otro', outcome: 'cumple', observation: 'x' }], strengths: [], corrections: [], warnings: [], proposedMessage: 'x' }, config)).toThrow();
  });
});
