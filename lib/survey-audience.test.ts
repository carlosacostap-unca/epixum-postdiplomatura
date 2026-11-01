import { describe, expect, it } from 'vitest';
import { matchesSurveyAudience, normalizedSurveyAudience } from './survey-audience';
import { surveyDesignSchema, surveyPublicDto, type CourseSurvey } from './course-surveys';

describe('destinatarios por resultado publicado', () => {
  it.each([undefined, null, '', 'all'])('conserva la audiencia general anterior %j', audience => {
    expect(normalizedSurveyAudience(audience)).toBe('all');
    expect(matchesSurveyAudience(audience, null, false)).toBe(true);
  });
  it.each(['aprobado', 'no_aprobado', 'no_completo', null, undefined, 'regular'])('asigna grupos correctamente para %j', status => {
    expect(matchesSurveyAudience('approved', status, true)).toBe(status === 'aprobado');
    expect(matchesSurveyAudience('not_approved_or_incomplete', status, true)).toBe(status === 'no_aprobado' || status === 'no_completo');
  });
  it('rechaza destinatarios desconocidos y bloquea segmentadas con resultados deshabilitados', () => {
    expect(matchesSurveyAudience('unknown', 'aprobado', true)).toBe(false);
    expect(() => normalizedSurveyAudience('unknown')).toThrow();
    expect(matchesSurveyAudience('approved', 'aprobado', false)).toBe(false);
    expect(matchesSurveyAudience('not_approved_or_incomplete', 'no_completo', false)).toBe(false);
  });
  it('normaliza guardados generales y conserva la selección en el DTO', () => {
    const design = { title: 'Encuesta', description: '', anonymous: true, closesAt: '', questions: [{ id: 'q', title: 'Opinión', type: 'text', required: false, options: [] }] };
    expect(surveyDesignSchema.parse(design).audience).toBe('all');
    expect(surveyDesignSchema.parse({ ...design, audience: 'approved' }).audience).toBe('approved');
    expect(surveyDesignSchema.safeParse({ ...design, audience: 'desconocido' }).success).toBe(false);
    expect(surveyPublicDto({ ...design, id: 'survey000000001', course: 'course000000001', revision: 'r', status: 'draft', audience: 'not_approved_or_incomplete' } as CourseSurvey).audience).toBe('not_approved_or_incomplete');
  });
});
