import { z } from 'zod';
import { practiceQuestionSchema, type PracticeQuestion, type PublicPracticeQuestion, type PracticeReview } from './preparation';

const date = z.string().refine(v => !v || (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))), 'Ingresá una fecha y hora válidas.');
export const examSessionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).refine(id => id !== 'primary'),
  label: z.string().trim().min(1).max(80),
  opensAt: date,
  closesAt: date,
  questions: z.array(practiceQuestionSchema).max(80),
}).strict();
export type ExamSession = z.infer<typeof examSessionSchema>;
export type ExamSessionSchedule = Omit<ExamSession, 'questions'>;
export const courseExamSchema = z.object({
  title: z.string().trim().min(1, 'Completá el título.').max(160),
  description: z.string().trim().max(2000),
  status: z.enum(['draft', 'published', 'archived']),
  opensAt: date,
  closesAt: date,
  questions: z.array(practiceQuestionSchema).max(80),
  sessions: z.array(examSessionSchema).max(3).optional(),
}).strict().superRefine((exam, ctx) => {
  if (!!exam.opensAt !== !!exam.closesAt || (exam.opensAt && Date.parse(exam.closesAt) <= Date.parse(exam.opensAt))) ctx.addIssue({ code: 'custom', message: 'El cierre debe ser posterior a la activación; completá ambas fechas.' });
  if (exam.status === 'published' && (!exam.opensAt || !exam.closesAt || !exam.questions.length)) ctx.addIssue({ code: 'custom', message: 'Para publicar, agregá preguntas y las fechas de activación y cierre.' });
  if (new Set(exam.questions.map(q => q.id)).size !== exam.questions.length) ctx.addIssue({ code: 'custom', message: 'Hay identificadores de preguntas repetidos.' });
  const sessions = exam.sessions || [];
  if (new Set(sessions.map(s => s.id)).size !== sessions.length) ctx.addIssue({ code: 'custom', message: 'Hay identificadores de turnos repetidos.' });
  const windows = [exam, ...sessions];
  for (const session of sessions) {
    if (!!session.opensAt !== !!session.closesAt || (session.opensAt && Date.parse(session.closesAt) <= Date.parse(session.opensAt))) ctx.addIssue({ code: 'custom', message: 'Completá una apertura y un cierre válidos para cada turno.' });
    if (exam.status === 'published' && (!session.opensAt || !session.closesAt || !session.questions.length)) ctx.addIssue({ code: 'custom', message: 'Para publicar, completá las preguntas y fechas de todos los turnos.' });
    if (session.questions.length !== exam.questions.length) ctx.addIssue({ code: 'custom', message: 'Todos los turnos deben tener la misma cantidad de preguntas.' });
    if (new Set(session.questions.map(q => q.id)).size !== session.questions.length) ctx.addIssue({ code: 'custom', message: 'Hay identificadores de preguntas repetidos en un turno.' });
  }
  for (let i = 0; i < windows.length; i++) for (let j = i + 1; j < windows.length; j++) {
    const a = windows[i], b = windows[j];
    if (a.opensAt && b.opensAt && Date.parse(a.opensAt) < Date.parse(b.closesAt) && Date.parse(b.opensAt) < Date.parse(a.closesAt)) ctx.addIssue({ code: 'custom', message: 'Los horarios de los turnos no pueden superponerse.' });
    const prompts = new Set(a.questions.map(q => q.prompt.trim().toLocaleLowerCase('es')));
    if (b.questions.some(q => prompts.has(q.prompt.trim().toLocaleLowerCase('es')))) ctx.addIssue({ code: 'custom', message: 'Cada turno debe tener preguntas distintas.' });
  }
  if (new TextEncoder().encode(JSON.stringify(exam)).length > 200_000) ctx.addIssue({ code: 'custom', message: 'El parcial supera los 200 KB.' });
});
export type CourseExamInput = z.infer<typeof courseExamSchema>;
export type CourseExam = CourseExamInput & { id: string; course: string };
export type CourseExamSummary = Omit<CourseExam, 'questions' | 'sessions'> & { sessions?: ExamSessionSchedule[] };
export function examSchedule(exam: Pick<CourseExamSummary, 'opensAt' | 'closesAt' | 'sessions'>): ExamSessionSchedule[] {
  return [{ id: 'primary', label: 'Turno 1', opensAt: exam.opensAt, closesAt: exam.closesAt }, ...(exam.sessions || []).map(({ id, label, opensAt, closesAt }) => ({ id, label, opensAt, closesAt }))];
}
/** Explicit projection: no question bank or answer key crosses into a student page. */
export function examSummary(exam: CourseExam): CourseExamSummary {
  return { id: exam.id, course: exam.course, title: exam.title, description: exam.description, status: exam.status, opensAt: exam.opensAt, closesAt: exam.closesAt, ...(exam.sessions?.length ? { sessions: examSchedule(exam).slice(1) } : {}) };
}
const timestamp = (value: string) => Date.parse(value.replace(' ', 'T'));
export function activeExamSession(exam: CourseExam, now = Date.now()) {
  const schedule = examSchedule(exam).find(s => now >= timestamp(s.opensAt) && now < timestamp(s.closesAt));
  if (!schedule) return null;
  const questions = schedule.id === 'primary' ? exam.questions : exam.sessions!.find(s => s.id === schedule.id)!.questions;
  return { ...schedule, questions };
}
export type ExamAttempt = { id: string; exam: string; course: string; student: string; title: string; snapshot: CourseExamInput; deadline: string; created: string; cameraActive: boolean; cameraLastSeen: string; photoKey?: string };
export type ExamAnswerEvent = { id: string; attempt: string; questionId: string; optionId: string; mutationId: string; created: string };
export type ExamResult = { id: string; attempt: string; finishedAt: string; reason: 'submitted' | 'expired'; correct: number; total: number; percentage: number; selected: Record<string, string> };
type ExamReceipt = Pick<ExamResult, 'id' | 'attempt' | 'finishedAt' | 'reason'>;
export type ExamResultSummary = (ExamReceipt & { feedbackAvailable: false }) | (ExamReceipt & { feedbackAvailable: true; correct: number; total: number; percentage: number });
export type ExamVisibleResult = (ExamReceipt & { feedbackAvailable: false; selected: Record<string, string> }) | (ExamReceipt & { feedbackAvailable: true; selected: Record<string, string>; correct: number; total: number; percentage: number; review: PracticeReview[] });
export type ExamStudent = { name: string; email?: string };
export type ExamView = { id: string; examId: string; title: string; description: string; questions: PublicPracticeQuestion[]; selected: Record<string, string>; deadline: string; serverNow: number; result: ExamVisibleResult | null; student?: ExamStudent; initialPhotoUrl?: string };
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
export function examAvailability(exam: Pick<CourseExamSummary, 'status' | 'opensAt' | 'closesAt' | 'sessions'>, now = Date.now()) {
  if (exam.status !== 'published') return exam.status === 'draft' ? 'Borrador' : 'Archivado';
  const windows = examSchedule(exam);
  if (windows.some(s => now >= timestamp(s.opensAt) && now < timestamp(s.closesAt))) return 'Activo';
  return windows.some(s => now < timestamp(s.opensAt)) ? 'Programado' : 'Cerrado';
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
