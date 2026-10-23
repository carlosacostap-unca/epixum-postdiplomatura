import { z } from 'zod';
import { practiceQuestionSchema, type PracticeQuestion, type PublicPracticeQuestion, type PracticeReview } from './preparation';

const date = z.string().refine(v => !v || (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))), 'Ingresá una fecha y hora válidas.');
export const courseExamSchema = z.object({
  title: z.string().trim().min(1, 'Completá el título.').max(160),
  description: z.string().trim().max(2000),
  status: z.enum(['draft', 'published', 'archived']),
  opensAt: date,
  closesAt: date,
  questions: z.array(practiceQuestionSchema).max(80),
}).strict().superRefine((exam, ctx) => {
  if (!!exam.opensAt !== !!exam.closesAt || (exam.opensAt && Date.parse(exam.closesAt) <= Date.parse(exam.opensAt))) ctx.addIssue({ code: 'custom', message: 'El cierre debe ser posterior a la activación; completá ambas fechas.' });
  if (exam.status === 'published' && (!exam.opensAt || !exam.closesAt || !exam.questions.length)) ctx.addIssue({ code: 'custom', message: 'Para publicar, agregá preguntas y las fechas de activación y cierre.' });
  if (new Set(exam.questions.map(q => q.id)).size !== exam.questions.length) ctx.addIssue({ code: 'custom', message: 'Hay identificadores de preguntas repetidos.' });
  if (new TextEncoder().encode(JSON.stringify(exam)).length > 200_000) ctx.addIssue({ code: 'custom', message: 'El parcial supera los 200 KB.' });
});
export type CourseExamInput = z.infer<typeof courseExamSchema>;
export type CourseExam = CourseExamInput & { id: string; course: string };
export type ExamAttempt = { id: string; exam: string; course: string; student: string; title: string; snapshot: CourseExamInput; deadline: string; created: string; cameraActive: boolean; cameraLastSeen: string };
export type ExamAnswerEvent = { id: string; attempt: string; questionId: string; optionId: string; mutationId: string; created: string };
export type ExamResult = { id: string; attempt: string; finishedAt: string; reason: 'submitted' | 'expired'; correct: number; total: number; percentage: number; selected: Record<string, string> };
type ExamReceipt = Pick<ExamResult, 'id' | 'attempt' | 'finishedAt' | 'reason'>;
export type ExamResultSummary = (ExamReceipt & { feedbackAvailable: false }) | (ExamReceipt & { feedbackAvailable: true; correct: number; total: number; percentage: number });
export type ExamVisibleResult = (ExamReceipt & { feedbackAvailable: false; selected: Record<string, string> }) | (ExamReceipt & { feedbackAvailable: true; selected: Record<string, string>; correct: number; total: number; percentage: number; review: PracticeReview[] });
export type ExamView = { id: string; title: string; description: string; questions: PublicPracticeQuestion[]; selected: Record<string, string>; deadline: string; serverNow: number; result: ExamVisibleResult | null };
export function examFeedbackReleased(deadline: string, now = Date.now()) { return now >= Date.parse(deadline.replace(' ', 'T')); }
/** Explicit projections keep scores out of serialized responses before the common closing time. */
export function examResultSummary(result: Omit<ExamResult, 'selected'>, released: boolean): ExamResultSummary {
  const receipt = { id: result.id, attempt: result.attempt, finishedAt: result.finishedAt, reason: result.reason };
  return released ? { ...receipt, feedbackAvailable: true, correct: result.correct, total: result.total, percentage: result.percentage } : { ...receipt, feedbackAvailable: false };
}
export function visibleExamResult(result: ExamResult, attempt: Pick<ExamAttempt, 'deadline' | 'snapshot'>, mode: 'manage' | 'student', now = Date.now()): ExamVisibleResult {
  const summary = examResultSummary(result, mode === 'manage' || examFeedbackReleased(attempt.deadline, now));
  if (!summary.feedbackAvailable) return { ...summary, selected: result.selected };
  const review = attempt.snapshot.questions.map(question => ({ question, selectedOptionId: result.selected[question.id] ?? null, correct: result.selected[question.id] === question.correctOptionId }));
  return { ...summary, selected: result.selected, review };
}
export const examStatusLabels = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' };
export function examAvailability(exam: Pick<CourseExam, 'status' | 'opensAt' | 'closesAt'>, now = Date.now()) {
  if (exam.status !== 'published') return exam.status === 'draft' ? 'Borrador' : 'Archivado';
  if (now < Date.parse(exam.opensAt.replace(' ', 'T'))) return 'Programado';
  return now >= Date.parse(exam.closesAt.replace(' ', 'T')) ? 'Cerrado' : 'Activo';
}
export function examSelections(events: ExamAnswerEvent[], cutoff: string) {
  const selected: Record<string, string> = {};
  for (const event of [...events].sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id))) {
    if (Date.parse(event.created.replace(' ', 'T')) < Date.parse(cutoff)) selected[event.questionId] = event.optionId;
  }
  return selected;
}
export function examScore(questions: PracticeQuestion[], selected: Record<string, string>) {
  const correct = questions.filter(q => selected[q.id] === q.correctOptionId).length;
  return { correct, total: questions.length, percentage: questions.length ? Math.round(correct / questions.length * 100) : 0 };
}
/** Inputs in the editor always represent Buenos Aires time (UTC−03:00). */
export function examLocalDate(value: string) {
  return value ? new Date(Date.parse(value.replace(' ', 'T')) - 3 * 3600_000).toISOString().slice(0, 16) : '';
}
export function examDateInput(value: string) { return value ? new Date(`${value}:00-03:00`).toISOString() : ''; }
export function examDateLabel(value: string) {
  return value ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value.replace(' ', 'T'))) : 'Sin programar';
}
