import type { Assignment, Delivery, DeliveryDeadlineSnapshot, DeliveryHistoryEntry } from '@/types';

export type AssignmentDeadline = Pick<Assignment, 'dueDate' | 'allowLateSubmissions'>;

export function isAfterDeadline(dueDate?: string | null, at: string | Date = new Date()): boolean {
  if (!dueDate) return false;
  const deadline = Date.parse(dueDate);
  const instant = at instanceof Date ? at.getTime() : Date.parse(at);
  return Number.isFinite(deadline) && Number.isFinite(instant) && instant > deadline;
}

export function canSubmitAssignment(assignment: AssignmentDeadline, at: string | Date = new Date()): boolean {
  return assignment.allowLateSubmissions === true || !isAfterDeadline(assignment.dueDate, at);
}

export function createDeadlineSnapshot(dueDate: string | undefined | null, at: string): DeliveryDeadlineSnapshot {
  return { dueDate: dueDate && Number.isFinite(Date.parse(dueDate)) ? new Date(dueDate).toISOString() : null, late: isAfterDeadline(dueDate, at) };
}

export function parseDeadlineSnapshot(value: unknown): DeliveryDeadlineSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.late !== 'boolean' || !(record.dueDate === null || (typeof record.dueDate === 'string' && Number.isFinite(Date.parse(record.dueDate))))) return undefined;
  if (record.dueDate === null && record.late) return undefined;
  return { dueDate: record.dueDate as string | null, late: record.late };
}

export function deliveryTiming(
  delivery: Pick<Delivery, 'created' | 'submittedAt' | 'deadlineSnapshot'> | Pick<DeliveryHistoryEntry, 'submittedAt' | 'deadlineSnapshot'>,
  currentDueDate?: string,
) {
  const snapshot = parseDeadlineSnapshot(delivery.deadlineSnapshot);
  if (snapshot) return { ...snapshot, recorded: true };
  const submittedAt = delivery.submittedAt || ('created' in delivery ? delivery.created : undefined);
  return { dueDate: currentDueDate || null, late: Boolean(submittedAt && isAfterDeadline(currentDueDate, submittedAt)), recorded: false };
}

export function lateSubmissionsFromForm(formData: FormData): boolean {
  return ['on', 'true', '1'].includes(String(formData.get('allowLateSubmissions') || ''));
}
