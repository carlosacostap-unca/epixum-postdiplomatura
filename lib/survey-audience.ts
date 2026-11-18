import { z } from 'zod';

export const surveyAudienceSchema = z.enum(['all', 'approved', 'not_approved_or_incomplete', 'promotion_roster']);
export type SurveyAudience = z.infer<typeof surveyAudienceSchema>;
export const surveyAudienceLabels: Record<SurveyAudience, string> = {
  promotion_roster: 'Promocionados de la nómina',
  all: 'Todos los alumnos matriculados',
  approved: 'Resultado publicado: Aprobado',
  not_approved_or_incomplete: 'Resultado publicado: No aprobado o No completó',
};

export function normalizedSurveyAudience(value: unknown): SurveyAudience {
  if (value === undefined || value === null || value === '') return 'all';
  return surveyAudienceSchema.parse(value);
}

export function matchesSurveyAudience(audience: unknown, publishedStatus: unknown, outcomesEnabled: boolean) {
  const parsed = surveyAudienceSchema.safeParse(audience === undefined || audience === null || audience === '' ? 'all' : audience);
  if (!parsed.success) return false;
  if (parsed.data === 'all') return true;
  if (parsed.data === 'promotion_roster' || !outcomesEnabled) return false;
  return parsed.data === 'approved' ? publishedStatus === 'aprobado' : publishedStatus === 'no_aprobado' || publishedStatus === 'no_completo';
}
