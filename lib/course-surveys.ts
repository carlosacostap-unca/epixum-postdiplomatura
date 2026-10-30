import { z } from 'zod';

const key = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value), 'Identificador no válido.');
const option = z.object({ id: key, label: z.string().trim().min(1, 'Completá las opciones.').max(300) }).strict();
const question = z.object({
  id: key,
  title: z.string().trim().min(1, 'Completá el enunciado de cada pregunta.').max(500),
  type: z.enum(['single', 'multiple', 'scale', 'text']),
  required: z.boolean(),
  options: z.array(option).max(20),
}).strict().superRefine((q, ctx) => {
  if (q.type === 'single' || q.type === 'multiple') {
    if (q.options.length < 2) ctx.addIssue({ code: 'custom', message: 'Agregá al menos dos opciones.' });
    if (new Set(q.options.map(o => o.id)).size !== q.options.length || new Set(q.options.map(o => o.label.toLocaleLowerCase())).size !== q.options.length) {
      ctx.addIssue({ code: 'custom', message: 'Las opciones no pueden repetirse.' });
    }
  } else if (q.options.length) ctx.addIssue({ code: 'custom', message: 'Las escalas y textos no admiten opciones.' });
});

export const surveyDesignSchema = z.object({
  title: z.string().trim().min(1, 'Completá el título.').max(160),
  description: z.string().trim().max(3000),
  anonymous: z.boolean(),
  closesAt: z.union([z.literal(''), z.iso.datetime({ offset: true })]),
  questions: z.array(question).min(1, 'Agregá al menos una pregunta.').max(40, 'Se admiten hasta 40 preguntas.'),
}).strict().superRefine((data, ctx) => {
  if (new Set(data.questions.map(q => q.id)).size !== data.questions.length) ctx.addIssue({ code: 'custom', message: 'Hay preguntas con identificadores repetidos.' });
  if (new TextEncoder().encode(JSON.stringify(data.questions)).length > 180_000) ctx.addIssue({ code: 'custom', message: 'El diseño es demasiado extenso.' });
});

export type SurveyQuestion = z.infer<typeof question>;
export type SurveyDesign = z.infer<typeof surveyDesignSchema>;
export type CourseSurvey = SurveyDesign & { id: string; course: string; status: 'draft' | 'published' | 'closed'; revision: string };
export type SurveyAnswers = Record<string, string | string[] | number>;
export type SurveyResponse = { answers: SurveyAnswers; student?: string };
export type SurveySummary = CourseSurvey & { responseCount: number; submitted: boolean };
export const surveyQuestionLabels: Record<SurveyQuestion['type'], string> = { single: 'Opción única', multiple: 'Selección múltiple', scale: 'Escala de 1 a 5', text: 'Respuesta abierta' };

export class SurveyError extends Error {}

export function surveyIsOpen(survey: Pick<CourseSurvey, 'status' | 'closesAt'>, now = Date.now()) {
  return survey.status === 'published' && (!survey.closesAt || Date.parse(survey.closesAt) > now);
}

export function parseSurveyAnswers(questions: SurveyQuestion[], input: unknown): SurveyAnswers {
  const parsed = z.record(key, z.union([z.string().max(3000), z.array(key).max(20), z.number().int()])).safeParse(input);
  if (!parsed.success) throw new SurveyError('Revisá las respuestas: hay valores inválidos.');
  if (Object.keys(parsed.data).some(id => !questions.some(q => q.id === id))) throw new SurveyError('La respuesta incluye una pregunta que no pertenece a esta encuesta.');
  const answers: SurveyAnswers = {};
  for (const q of questions) {
    const value = parsed.data[q.id];
    const empty = value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
    if (empty) {
      if (q.required) throw new SurveyError(`Respondé la pregunta «${q.title}».`);
      continue;
    }
    const valid = q.type === 'text' ? typeof value === 'string'
      : q.type === 'scale' ? typeof value === 'number' && value >= 1 && value <= 5
      : q.type === 'single' ? typeof value === 'string' && q.options.some(o => o.id === value)
      : Array.isArray(value) && new Set(value).size === value.length && value.every(v => q.options.some(o => o.id === v));
    if (!valid) throw new SurveyError(`Revisá la respuesta a «${q.title}».`);
    answers[q.id] = typeof value === 'string' ? value.trim() : value;
  }
  if (new TextEncoder().encode(JSON.stringify(answers)).length > 180_000) throw new SurveyError('Las respuestas son demasiado extensas. Acortá los textos antes de enviar.');
  return answers;
}

export function surveyPublicDto(record: CourseSurvey): CourseSurvey {
  return { id: record.id, course: record.course, status: record.status, revision: record.revision, title: record.title, description: record.description, anonymous: record.anonymous, closesAt: record.closesAt ? new Date(record.closesAt).toISOString() : '', questions: record.questions };
}

// No response-level rows, IDs, timestamps or submission order in anonymous results.
export function aggregateSurvey(survey: CourseSurvey, responses: SurveyResponse[]) {
  return {
    total: responses.length,
    questions: survey.questions.map(q => {
      const values = responses.map(r => r.answers[q.id]).filter(v => v !== undefined);
      const choices = q.type === 'scale' ? Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), label: String(i + 1) })) : q.options;
      return {
        id: q.id, title: q.title, type: q.type, answered: values.length,
        options: choices.map(o => {
          const count = values.filter(v => Array.isArray(v) ? v.includes(o.id) : String(v) === o.id).length;
          return { label: o.label, count, percent: values.length ? Math.round(count * 100 / values.length) : 0 };
        }),
        texts: q.type === 'text' ? values.filter((v): v is string => typeof v === 'string').sort((a, b) => a.localeCompare(b, 'es')) : [],
      };
    }),
  };
}

export type SurveyResults = ReturnType<typeof aggregateSurvey> & { individuals: { name: string; answers: SurveyAnswers }[] };
