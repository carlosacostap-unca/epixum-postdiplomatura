import { z } from 'zod';
import type { AIVerdict } from '@/types';

export const AI_VERDICTS = ['Aprobado', 'Desaprobado', 'Corregir y reenviar'] as const;

export const aiCriterionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2_000),
  weight: z.number().min(0).max(100).nullable().optional(),
}).strict();

export const assignmentAIConfigInputSchema = z.object({
  active: z.boolean(),
  criteria: z.array(aiCriterionSchema).max(30),
  requiredChecks: z.array(z.string().trim().min(1).max(500)).max(50),
  allowedVerdicts: z.array(z.enum(AI_VERDICTS)).max(AI_VERDICTS.length),
  gradeEnabled: z.boolean(),
  gradeMin: z.number().finite().nullable(),
  gradeMax: z.number().finite().nullable(),
  messageGuidance: z.string().trim().max(4_000),
  additionalInstructions: z.string().trim().max(12_000),
}).strict().superRefine((value, context) => {
  if (value.active && value.criteria.length === 0) {
    context.addIssue({ code: 'custom', path: ['criteria'], message: 'La configuración activa requiere al menos un criterio.' });
  }
  if (value.active && value.allowedVerdicts.length === 0) {
    context.addIssue({ code: 'custom', path: ['allowedVerdicts'], message: 'La configuración activa requiere al menos un veredicto.' });
  }
  if (new Set(value.criteria.map((criterion) => criterion.id)).size !== value.criteria.length) {
    context.addIssue({ code: 'custom', path: ['criteria'], message: 'Cada criterio debe tener un identificador único.' });
  }
  if (new Set(value.allowedVerdicts).size !== value.allowedVerdicts.length) {
    context.addIssue({ code: 'custom', path: ['allowedVerdicts'], message: 'No se pueden repetir veredictos.' });
  }
  if (value.active && value.gradeEnabled) {
    if (value.gradeMin === null || value.gradeMax === null) {
      context.addIssue({ code: 'custom', path: ['gradeMin'], message: 'La escala requiere mínimo y máximo.' });
    } else if (value.gradeMin >= value.gradeMax) {
      context.addIssue({ code: 'custom', path: ['gradeMax'], message: 'El máximo debe ser mayor que el mínimo.' });
    }
  } else if (!value.gradeEnabled && (value.gradeMin !== null || value.gradeMax !== null)) {
    context.addIssue({ code: 'custom', path: ['gradeEnabled'], message: 'La escala debe quedar vacía cuando la nota está deshabilitada.' });
  }
});

export const aiPreevaluationResultSchema = z.object({
  verdict: z.enum(AI_VERDICTS),
  suggestedGrade: z.number().finite().nullable(),
  criteria: z.array(z.object({
    criterionId: z.string().min(1).max(80),
    criterion: z.string().min(1).max(160),
    outcome: z.enum(['cumple', 'parcial', 'no_cumple', 'no_verificable']),
    observation: z.string().min(1).max(4_000),
  }).strict()).min(1).max(30),
  strengths: z.array(z.string().min(1).max(2_000)).max(30),
  corrections: z.array(z.string().min(1).max(2_000)).max(30),
  warnings: z.array(z.string().min(1).max(2_000)).max(30),
  proposedMessage: z.string().min(1).max(12_000),
}).strict();

export function createAIPreevaluationResultSchema(
  allowedVerdicts: AIVerdict[],
  grade: { enabled: boolean; min: number | null; max: number | null } = { enabled: true, min: null, max: null },
) {
  if (allowedVerdicts.length === 0) throw new Error('La configuración no contiene veredictos permitidos.');
  const gradeSchema = grade.enabled
    ? z.number().finite().min(grade.min ?? -Number.MAX_SAFE_INTEGER).max(grade.max ?? Number.MAX_SAFE_INTEGER)
    : z.null();
  return aiPreevaluationResultSchema.extend({
    verdict: z.enum(allowedVerdicts as [AIVerdict, ...AIVerdict[]]),
    suggestedGrade: gradeSchema,
  });
}

export const repositoryCoverageSchema = z.object({
  commitSha: z.string().regex(/^[a-f0-9]{40}$/i),
  includedFiles: z.array(z.string().min(1)).max(2_000),
  omittedFiles: z.array(z.object({ path: z.string().min(1), reason: z.string().min(1) }).strict()).max(2_000),
  includedBytes: z.number().int().nonnegative(),
  expandedBytes: z.number().int().nonnegative(),
  totalEntries: z.number().int().nonnegative(),
  partial: z.boolean(),
}).strict();

export type AssignmentAIConfigInput = z.infer<typeof assignmentAIConfigInputSchema>;
export type ValidatedAIPreevaluationResult = z.infer<typeof aiPreevaluationResultSchema>;

export function validateAIResultForConfig(
  raw: unknown,
  config: AssignmentAIConfigInput,
): ValidatedAIPreevaluationResult {
  const result = aiPreevaluationResultSchema.parse(raw);
  if (!config.allowedVerdicts.includes(result.verdict)) {
    throw new Error('El proveedor devolvió un veredicto no permitido por la configuración.');
  }
  const expectedCriteria = new Set(config.criteria.map((criterion) => criterion.id));
  const receivedCriteria = new Set(result.criteria.map((criterion) => criterion.criterionId));
  if (expectedCriteria.size !== receivedCriteria.size || [...expectedCriteria].some((id) => !receivedCriteria.has(id))) {
    throw new Error('El proveedor no respondió todos los criterios configurados.');
  }
  if (!config.gradeEnabled && result.suggestedGrade !== null) {
    throw new Error('El proveedor devolvió una nota para un trabajo sin escala numérica.');
  }
  if (config.gradeEnabled) {
    if (result.suggestedGrade === null || config.gradeMin === null || config.gradeMax === null) {
      throw new Error('El proveedor no devolvió una nota válida para la escala configurada.');
    }
    if (result.suggestedGrade < config.gradeMin || result.suggestedGrade > config.gradeMax) {
      throw new Error('La nota sugerida está fuera de la escala configurada.');
    }
  }
  return result;
}
