// @vitest-environment node

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { describe, expect, it } from 'vitest';
import { createAIPreevaluationResultSchema } from './ai-preevaluation-schema';
import { AI_PREEVALUATION_INSTRUCTIONS, buildAIPreevaluationInput } from './ai-preevaluation-prompt';

describe.skipIf(process.env.RUN_OPENAI_AI_SMOKE !== '1' || !process.env.OPENAI_API_KEY)('smoke OpenAI estructurado', () => {
  it('evalúa solamente una evidencia sintética mínima', async () => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 });
    const config = { active: true, criteria: [{ id: 'c1', title: 'Constante', description: 'Declara answer con valor 42', weight: null }], requiredChecks: [], allowedVerdicts: ['Aprobado' as const], gradeEnabled: false, gradeMin: null, gradeMax: null, messageGuidance: 'Breve', additionalInstructions: '' };
    const response = await client.responses.parse({
      model: 'gpt-5.6-luna', reasoning: { effort: 'medium' }, store: false, tools: [], max_output_tokens: 2_000,
      instructions: AI_PREEVALUATION_INSTRUCTIONS,
      input: buildAIPreevaluationInput({ assignmentTitle: 'Fixture sintético', assignmentDescription: 'Declarar una constante answer con valor 42.', config, commitSha: 'a'.repeat(40), evidence: '<<<ARCHIVO_NO_CONFIABLE ruta="index.ts">>>\nexport const answer = 42;\n<<<FIN_ARCHIVO_NO_CONFIABLE>>>' }),
      text: { format: zodTextFormat(createAIPreevaluationResultSchema(config.allowedVerdicts, { enabled: false, min: null, max: null }), 'academic_preevaluation_smoke') },
    });
    expect(response.output_parsed?.verdict).toBe('Aprobado');
    expect(response.output_parsed?.suggestedGrade).toBeNull();
  }, 90_000);
});
