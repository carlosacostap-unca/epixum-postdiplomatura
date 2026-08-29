import type { AssignmentAIConfig } from '@/types';
import type { AssignmentAIConfigInput } from './ai-preevaluation-schema';

export interface AssignmentAIConfigDTO extends AssignmentAIConfigInput {
  id?: string;
  version: number;
}

export function assignmentAIConfigDTO(record: Partial<AssignmentAIConfig>): AssignmentAIConfigDTO {
  return {
    id: record.id,
    active: Boolean(record.active),
    criteria: Array.isArray(record.criteria) ? record.criteria : [],
    requiredChecks: Array.isArray(record.requiredChecks) ? record.requiredChecks : [],
    allowedVerdicts: Array.isArray(record.allowedVerdicts) ? record.allowedVerdicts : [],
    gradeEnabled: Boolean(record.gradeEnabled),
    gradeMin: typeof record.gradeMin === 'number' ? record.gradeMin : null,
    gradeMax: typeof record.gradeMax === 'number' ? record.gradeMax : null,
    messageGuidance: String(record.messageGuidance || ''),
    additionalInstructions: String(record.additionalInstructions || ''),
    version: Math.max(1, Number(record.version || 1)),
  };
}

export function emptyAssignmentAIConfig(): AssignmentAIConfigDTO {
  return {
    active: false,
    criteria: [],
    requiredChecks: [],
    allowedVerdicts: ['Aprobado', 'Desaprobado', 'Corregir y reenviar'],
    gradeEnabled: false,
    gradeMin: null,
    gradeMax: null,
    messageGuidance: 'Redactá una devolución clara, respetuosa y accionable para el estudiante.',
    additionalInstructions: '',
    version: 1,
  };
}
