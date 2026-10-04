import { describe, it, expect } from 'vitest';
import { gradePractice, practiceQuizSchema, publicPracticeQuestions, type PracticeQuestion } from './preparation';

export const question: PracticeQuestion = { id: 'q1', prompt: '¿Qué nivel elegir?', options: [{ id: 'a', label: 'El adecuado al problema' }, { id: 'b', label: 'Siempre el más complejo' }], correctOptionId: 'a', explanation: 'La complejidad debe justificarse.' };
describe('preparación: validación y corrección', () => {
  it('permite borrador vacío pero exige preguntas para publicar', () => {
    expect(practiceQuizSchema.safeParse({ title: 'Práctica', status: 'draft', questions: [] }).success).toBe(true);
    expect(practiceQuizSchema.safeParse({ title: 'Práctica', status: 'published', questions: [] }).success).toBe(false);
  });
  it('rechaza claves ajenas e identificadores repetidos', () => {
    const base = { title: 'Práctica', status: 'published' };
    expect(practiceQuizSchema.safeParse({ ...base, questions: [{ ...question, correctOptionId: 'x' }] }).success).toBe(false);
    expect(practiceQuizSchema.safeParse({ ...base, questions: [question, question] }).success).toBe(false);
    expect(practiceQuizSchema.safeParse({ ...base, questions: [{ ...question, options: [question.options[0], question.options[0]] }] }).success).toBe(false);
  });
  it('no entrega soluciones, explicaciones ni campos nuevos en la versión pública', () => {
    expect(publicPracticeQuestions([{ ...question, secret: 'private' } as PracticeQuestion])).toEqual([{ id: 'q1', prompt: question.prompt, options: question.options }]);
  });
  it('cuenta errores y omitidas, preservando la revisión de cada pregunta', () => {
    const qs = [question, { ...question, id: 'q2' }, { ...question, id: 'q3' }];
    const result = gradePractice(qs, { q1: 'a', q2: 'b' });
    expect(result).toMatchObject({ correct: 1, total: 3, percentage: 33 });
    expect(result.review.map(r => r.selectedOptionId)).toEqual(['a', 'b', null]);
    expect(result.review[0].question.explanation).toBe(question.explanation);
  });
  it('rechaza opciones y preguntas que no pertenecen al intento', () => {
    expect(() => gradePractice([question], { q1: 'x' })).toThrow();
    expect(() => gradePractice([question], { other: 'a' })).toThrow();
    expect(() => gradePractice([question], { q1: ['a', 'b'] })).toThrow();
  });
});
