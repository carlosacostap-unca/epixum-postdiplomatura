import { z } from 'zod';

export const outcomeLabels = { aprobado: 'Aprobado', no_aprobado: 'No aprobado', no_completo: 'No completó' } as const;
export const outcomeDraftSchema = z.object({
  status: z.enum(['aprobado', 'no_aprobado', 'no_completo'], { error: 'Elegí Aprobado, No aprobado o No completó.' }),
  grade: z.number({ error: 'Ingresá una nota válida o dejala vacía.' }).min(0, 'La nota debe estar entre 0 y 10.').max(10, 'La nota debe estar entre 0 y 10.').refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, 'La nota admite hasta dos decimales.').nullable().default(null),
  feedback: z.string().trim().max(5000, 'La devolución admite hasta 5000 caracteres.').default(''),
}).strict();

export type OutcomeDraft = z.infer<typeof outcomeDraftSchema>;
export type PublishedOutcome = OutcomeDraft & { publishedAt: string };
export type CourseOutcome = { id: string; course: string; student: string; draft: OutcomeDraft; published: PublishedOutcome | null; revision: string };
export type OutcomeHistory = { id: string; action: 'save' | 'publish' | 'withdraw'; actorName: string; occurredAt: string; snapshot: { draft: OutcomeDraft; published: PublishedOutcome | null } };
export class OutcomeError extends Error {}
export const outcomeHistoryLabels: Record<OutcomeHistory['action'], string> = { save: 'Borrador guardado', publish: 'Resultado publicado', withdraw: 'Publicación retirada' };

export function publishedOutcomeDto(value: unknown): PublishedOutcome | null {
  if (value === null || value === undefined) return null;
  const parsed = outcomeDraftSchema.extend({ publishedAt: z.iso.datetime({ offset: true }) }).strip().safeParse(value);
  if (!parsed.success) throw new OutcomeError('No pudimos leer el resultado publicado.');
  return parsed.data;
}
export function outcomeHasPendingChanges(outcome: Pick<CourseOutcome, 'draft' | 'published'>) {
  const published = outcome.published;
  return !published || outcome.draft.status !== published.status || outcome.draft.grade !== published.grade || outcome.draft.feedback !== published.feedback;
}
export function outcomeGradeLabel(grade: number | null) {
  return grade === null ? 'Sin nota' : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(grade);
}
export function outcomeTone(status: OutcomeDraft['status']) {
  return status === 'aprobado' ? 'success' as const : status === 'no_aprobado' ? 'error' as const : 'neutral' as const;
}
