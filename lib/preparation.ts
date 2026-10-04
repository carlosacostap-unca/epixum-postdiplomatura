import { z } from 'zod';

const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const option = z.object({ id: identifier, label: z.string().trim().min(1, 'Completá todas las opciones.').max(500) }).strict();
export const practiceQuestionSchema = z.object({
  id: identifier,
  prompt: z.string().trim().min(1, 'Completá el enunciado.').max(4000),
  options: z.array(option).min(2).max(8),
  correctOptionId: identifier,
  explanation: z.string().trim().max(4000).default(''),
}).strict().superRefine((q, ctx) => {
  if (new Set(q.options.map(o => o.id)).size !== q.options.length) ctx.addIssue({ code: 'custom', message: 'Las opciones tienen identificadores repetidos.' });
  if (!q.options.some(o => o.id === q.correctOptionId)) ctx.addIssue({ code: 'custom', message: 'Elegí la respuesta correcta de cada pregunta.' });
});
export const practiceQuizSchema = z.object({
  title: z.string().trim().min(1, 'Completá el título.').max(160),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(['draft', 'published', 'archived']),
  questions: z.array(practiceQuestionSchema).max(80),
}).strict().superRefine((quiz, ctx) => {
  if (quiz.status === 'published' && !quiz.questions.length) ctx.addIssue({ code: 'custom', message: 'Agregá al menos una pregunta antes de publicar.' });
  if (new Set(quiz.questions.map(q => q.id)).size !== quiz.questions.length) ctx.addIssue({ code: 'custom', message: 'Hay preguntas con identificadores repetidos.' });
  if (new TextEncoder().encode(JSON.stringify(quiz)).length > 200_000) ctx.addIssue({ code: 'custom', message: 'El cuestionario supera los 200 KB.' });
});
export type PracticeQuizInput = z.infer<typeof practiceQuizSchema>;
export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>;
export type PracticeQuiz = PracticeQuizInput & { id: string; course: string; updated: string };
export type PublicPracticeQuestion = Pick<PracticeQuestion, 'id' | 'prompt' | 'options'>;
export interface PracticeAttempt { id: string; course: string; quiz: string; student: string; title: string; snapshot: PracticeQuizInput; created: string }
export interface PracticeReview { question: PracticeQuestion; selectedOptionId: string | null; correct: boolean }
export interface PracticeResult { id: string; attempt: string; course: string; student: string; title: string; correct: number; total: number; percentage: number; review: PracticeReview[]; created: string }
export const practiceStatusLabels = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' };

export function publicPracticeQuestions(questions: PracticeQuestion[]): PublicPracticeQuestion[] {
  return questions.map(q => ({ id: q.id, prompt: q.prompt, options: q.options.map(o => ({ id: o.id, label: o.label })) }));
}

export function gradePractice(questions: PracticeQuestion[], input: unknown) {
  const answers = z.record(identifier, identifier).parse(input);
  if (!questions.length) throw new Error('El intento no tiene preguntas.');
  for (const [id, answer] of Object.entries(answers)) {
    const q = questions.find(q => q.id === id);
    if (!q || !q.options.some(o => o.id === answer)) throw new Error('La respuesta no pertenece a este intento.');
  }
  const review = questions.map(question => ({ question, selectedOptionId: answers[question.id] ?? null, correct: answers[question.id] === question.correctOptionId }));
  const correct = review.filter(r => r.correct).length;
  return { correct, total: questions.length, percentage: Math.round(correct / questions.length * 100), review };
}
