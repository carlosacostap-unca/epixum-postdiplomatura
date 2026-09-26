import type {
  AIVerdict,
  Delivery,
  DeliveryHistoryEntry,
  DeliveryPublishedEvaluation,
} from '@/types';

export type StudentDeliveryState =
  | 'pending'
  | 'resubmitted'
  | 'correction_requested'
  | 'approved'
  | 'rejected';

export type TeacherDeliveryState = StudentDeliveryState | 'draft';

export interface NormalizedDeliveryWorkflow {
  status: 'pending' | 'draft' | 'published';
  submissionVersion: number;
  evaluatedVersion: number;
  submittedAt: string;
  evaluatedAt?: string;
  resubmissionCount: number;
  history: DeliveryHistoryEntry[];
}

export interface DeliveryRevisionPatch {
  repositoryUrl: string;
  status: 'pending';
  grade: null;
  feedback: string;
  verdict: string;
  submissionVersion: number;
  evaluatedVersion: number;
  submittedAt: string;
  evaluatedAt: string;
  resubmissionCount: number;
  history: DeliveryHistoryEntry[];
}

const VERDICTS: AIVerdict[] = ['Aprobado', 'Desaprobado', 'Corregir y reenviar'];

function positiveInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function publishedEvaluation(value: unknown): DeliveryPublishedEvaluation | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.feedback !== 'string'
    || !VERDICTS.includes(candidate.verdict as AIVerdict)
  ) return undefined;
  return {
    ...(typeof candidate.grade === 'number' && Number.isFinite(candidate.grade) ? { grade: candidate.grade } : {}),
    feedback: candidate.feedback,
    verdict: candidate.verdict as AIVerdict,
    ...(validDate(candidate.evaluatedAt) ? { evaluatedAt: candidate.evaluatedAt } : {}),
  };
}

export function normalizeDeliveryHistory(value: unknown): DeliveryHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    if (!Number.isInteger(candidate.version) || Number(candidate.version) <= 0 || !validDate(candidate.submittedAt)) return [];
    const repositoryUrl = typeof candidate.repositoryUrl === 'string' && candidate.repositoryUrl.length > 0
      ? candidate.repositoryUrl
      : undefined;
    const evaluation = publishedEvaluation(candidate.evaluation);
    return [{
      version: Number(candidate.version),
      submittedAt: candidate.submittedAt,
      ...(repositoryUrl ? { repositoryUrl } : {}),
      ...(!repositoryUrl && candidate.contentUnavailable === true ? { contentUnavailable: true } : {}),
      ...(evaluation ? { evaluation } : {}),
    }];
  }).sort((a, b) => a.version - b.version);
}

export function normalizeDeliveryWorkflow(delivery: Delivery): NormalizedDeliveryWorkflow {
  const status = delivery.status === 'draft' || delivery.status === 'published' ? delivery.status : 'pending';
  const submissionVersion = positiveInteger(delivery.submissionVersion, 1);
  const evaluatedVersion = nonNegativeInteger(
    delivery.evaluatedVersion,
    status === 'published' ? submissionVersion : 0,
  );
  return {
    status,
    submissionVersion,
    evaluatedVersion: Math.min(evaluatedVersion, submissionVersion),
    submittedAt: validDate(delivery.submittedAt) ? delivery.submittedAt : delivery.created,
    ...(validDate(delivery.evaluatedAt)
      ? { evaluatedAt: delivery.evaluatedAt }
      : status === 'published' && validDate(delivery.updated)
        ? { evaluatedAt: delivery.updated }
        : {}),
    resubmissionCount: nonNegativeInteger(delivery.resubmissionCount, 0),
    history: normalizeDeliveryHistory(delivery.history),
  };
}

export function getStudentDeliveryState(delivery: Delivery): StudentDeliveryState {
  const workflow = normalizeDeliveryWorkflow(delivery);
  if (workflow.status === 'published') {
    if (delivery.verdict === 'Aprobado') return 'approved';
    if (delivery.verdict === 'Desaprobado') return 'rejected';
    if (delivery.verdict === 'Corregir y reenviar') return 'correction_requested';
  }
  return workflow.resubmissionCount > 0 ? 'resubmitted' : 'pending';
}

export function getTeacherDeliveryState(delivery: Delivery): TeacherDeliveryState {
  const workflow = normalizeDeliveryWorkflow(delivery);
  if (workflow.status === 'draft') return 'draft';
  return getStudentDeliveryState(delivery);
}

export function isDeliveryPendingReview(delivery: Delivery) {
  return normalizeDeliveryWorkflow(delivery).status !== 'published';
}

export function canStudentModifyDelivery(delivery: Delivery, isPastDue: boolean) {
  const workflow = normalizeDeliveryWorkflow(delivery);
  if (workflow.status === 'published') {
    if (delivery.verdict === 'Aprobado' || delivery.verdict === 'Desaprobado') return false;
    if (delivery.verdict === 'Corregir y reenviar') return true;
  }
  return !isPastDue;
}

export function currentPublishedEvaluation(delivery: Delivery): DeliveryPublishedEvaluation | undefined {
  const workflow = normalizeDeliveryWorkflow(delivery);
  if (
    workflow.status !== 'published'
    || !delivery.verdict
    || !VERDICTS.includes(delivery.verdict)
    || typeof delivery.feedback !== 'string'
  ) return undefined;
  return {
    ...(typeof delivery.grade === 'number' && Number.isFinite(delivery.grade) ? { grade: delivery.grade } : {}),
    feedback: delivery.feedback,
    verdict: delivery.verdict,
    evaluatedAt: workflow.evaluatedAt || delivery.updated,
  };
}

export function latestPublishedEvaluation(delivery: Delivery): DeliveryPublishedEvaluation | undefined {
  const current = currentPublishedEvaluation(delivery);
  if (current) return current;
  const history = normalizeDeliveryWorkflow(delivery).history;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].evaluation) return history[index].evaluation;
  }
  return undefined;
}

export function prepareDeliveryRevision(
  delivery: Delivery,
  repositoryUrl: string,
  now: string,
  isPastDue: boolean,
): { success: true; patch: DeliveryRevisionPatch; correctionResubmission: boolean } | { success: false; error: string } {
  if (!canStudentModifyDelivery(delivery, isPastDue)) {
    if (delivery.status === 'published' && (delivery.verdict === 'Aprobado' || delivery.verdict === 'Desaprobado')) {
      return { success: false, error: 'La entrega ya tiene un resultado final y no admite nuevos cambios.' };
    }
    return { success: false, error: 'El plazo de entrega finalizó y no hay una corrección pendiente de reenvío.' };
  }
  if (!validDate(now)) return { success: false, error: 'La fecha del reenvío no es válida.' };

  const workflow = normalizeDeliveryWorkflow(delivery);
  const correctionResubmission = workflow.status === 'published' && delivery.verdict === 'Corregir y reenviar';
  const evaluation = currentPublishedEvaluation(delivery);
  const archived: DeliveryHistoryEntry = {
    version: workflow.submissionVersion,
    submittedAt: workflow.submittedAt,
    repositoryUrl: delivery.repositoryUrl,
    ...(evaluation ? { evaluation } : {}),
  };

  return {
    success: true,
    correctionResubmission,
    patch: {
      repositoryUrl,
      status: 'pending',
      grade: null,
      feedback: '',
      verdict: '',
      submissionVersion: workflow.submissionVersion + 1,
      evaluatedVersion: correctionResubmission ? workflow.submissionVersion : workflow.evaluatedVersion,
      submittedAt: now,
      evaluatedAt: '',
      resubmissionCount: workflow.resubmissionCount + (correctionResubmission ? 1 : 0),
      history: [...workflow.history, archived],
    },
  };
}

export function initialDeliveryWorkflow(now: string) {
  return {
    status: 'pending' as const,
    submissionVersion: 1,
    evaluatedVersion: 0,
    submittedAt: now,
    evaluatedAt: '',
    resubmissionCount: 0,
    history: [] as DeliveryHistoryEntry[],
  };
}
