import { describe, expect, it } from 'vitest';
import { aggregateSurvey, parseSurveyAnswers, surveyDesignSchema, surveyIsOpen, surveyPublicDto, type CourseSurvey } from './course-surveys';

export const exampleSurvey: CourseSurvey = {
  id: 'survey123456789', course: 'course123456789', revision: 'revision', status: 'published', title: 'Experiencia', description: '', anonymous: true, closesAt: '',
  questions: [
    { id: 'single', title: 'Experiencia previa', type: 'single', required: true, options: [{ id: 'yes', label: 'Sí' }, { id: 'no', label: 'No' }] },
    { id: 'multiple', title: 'Herramientas', type: 'multiple', required: false, options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
    { id: 'scale', title: 'Satisfacción', type: 'scale', required: false, options: [] },
    { id: 'text', title: 'Comentario', type: 'text', required: false, options: [] },
  ],
};

describe('contrato de encuestas', () => {
  const { title, description, anonymous, closesAt, questions } = exampleSurvey;
  const design = { title, description, anonymous, closesAt, questions };
  it('valida diseño y rechaza opciones repetidas, identificadores duplicados y fecha inválida', () => {
    expect(surveyDesignSchema.safeParse(design).success).toBe(true);
    expect(surveyDesignSchema.safeParse({ ...design, questions: [] }).success).toBe(false);
    expect(surveyDesignSchema.safeParse({ ...design, questions: [questions[0], questions[0]] }).success).toBe(false);
    expect(surveyDesignSchema.safeParse({ ...design, questions: [{ ...questions[0], options: [{ id: 'x', label: 'Sí' }, { id: 'y', label: 'sí' }] }] }).success).toBe(false);
    expect(surveyDesignSchema.safeParse({ ...design, closesAt: 'ayer' }).success).toBe(false);
    expect(surveyDesignSchema.safeParse({ ...design, questions: [{ ...questions[2], options: questions[0].options }] }).success).toBe(false);
  });
  it('normaliza textos y omite respuestas opcionales vacías', () => {
    expect(parseSurveyAnswers(questions, { single: 'yes', text: '  Bien  ', multiple: [], scale: 5 })).toEqual({ single: 'yes', text: 'Bien', scale: 5 });
  });
  it.each([{}, { single: 'other' }, { single: 'yes', scale: 6 }, { single: 'yes', scale: '4' }, { single: 'yes', multiple: ['a', 'a'] }, { single: 'yes', multiple: ['other'] }, { single: 'yes', unknown: 'x' }, { single: 'yes', text: ['a'] }])('rechaza respuestas inválidas %j', input => {
    expect(() => parseSurveyAnswers(questions, input)).toThrow();
  });
  it('exige selección múltiple obligatoria y valida los límites', () => {
    expect(() => parseSurveyAnswers([{ ...questions[1], required: true }], { multiple: [] })).toThrow('Herramientas');
    expect(parseSurveyAnswers(questions, { single: 'no', scale: 1 })).toEqual({ single: 'no', scale: 1 });
  });
  it('aplica cierre por estado y fecha, incluido el instante exacto', () => {
    const time = Date.parse('2026-10-30T18:00:00Z');
    const survey = { ...exampleSurvey, closesAt: '2026-10-30T18:00:00Z' };
    expect(surveyIsOpen(survey, time - 1)).toBe(true);
    expect(surveyIsOpen(survey, time)).toBe(false);
    expect(surveyIsOpen({ ...survey, status: 'closed' }, time - 1)).toBe(false);
    expect(surveyIsOpen({ ...survey, status: 'draft' }, time - 1)).toBe(false);
  });
  it('agrega por pregunta sin transmitir filas, identidades ni orden de llegada', () => {
    const results = aggregateSurvey(exampleSurvey, [
      { student: 'private-a', answers: { single: 'yes', multiple: ['a', 'b'], text: 'Zeta' } },
      { student: 'private-b', answers: { single: 'no', multiple: ['a'], text: 'Alfa', scale: 5 } },
      { student: 'private-c', answers: { single: 'yes' } },
    ]);
    expect(results.total).toBe(3);
    expect(results.questions[0].options[0]).toEqual({ label: 'Sí', count: 2, percent: 67 });
    expect(results.questions[1].options).toEqual([{ label: 'A', count: 2, percent: 100 }, { label: 'B', count: 1, percent: 50 }]);
    expect(results.questions[3].texts).toEqual(['Alfa', 'Zeta']);
    expect(JSON.stringify(results)).not.toMatch(/private-|student|created|updated/);
  });
  it('solo expone campos de diseño e interpreta fechas PocketBase', () => {
    const dto = surveyPublicDto({ ...exampleSurvey, closesAt: '2026-11-01 18:00:00.000Z', secret: 'hidden' } as CourseSurvey);
    expect(dto.closesAt).toBe('2026-11-01T18:00:00.000Z');
    expect(dto).not.toHaveProperty('secret');
  });
  it('rechaza identificadores reservados y textos que exceden el límite de almacenamiento en bytes', () => {
    expect(surveyDesignSchema.safeParse({ ...design, questions: [{ ...questions[3], id: '__proto__' }] }).success).toBe(false);
    const many = Array.from({ length: 40 }, (_, i) => ({ ...questions[3], id: `q${i}` }));
    const answers = Object.fromEntries(many.map(q => [q.id, '漢'.repeat(3000)]));
    expect(() => parseSurveyAnswers(many, answers)).toThrow('demasiado extensas');
  });
});
