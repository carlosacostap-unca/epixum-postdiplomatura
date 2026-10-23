import { describe, expect, it } from 'vitest';
import { courseExamSchema, examAvailability, examDateInput, examLocalDate, examScore, examSelections, type ExamAnswerEvent } from './course-exams';
const question = { id: 'q1', prompt: 'Pregunta', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: '' };
const draft = { title: 'Parcial', description: '', status: 'draft', opensAt: '', closesAt: '', questions: [question] };
describe('parciales programados', () => {
  it('permite preparar un borrador sin inventar fechas y exige una ventana válida al publicar', () => {
    expect(courseExamSchema.safeParse(draft).success).toBe(true);
    expect(courseExamSchema.safeParse({ ...draft, status: 'published' }).success).toBe(false);
    expect(courseExamSchema.safeParse({ ...draft, opensAt: '2026-10-23T12:00:00Z', closesAt: '2026-10-23T11:00:00Z' }).success).toBe(false);
    expect(courseExamSchema.safeParse({ ...draft, opensAt: '2026-10-23T12:00:00Z' }).success).toBe(false);
  });
  it('incluye el instante de apertura y excluye el de cierre, sin exponer borradores', () => {
    const exam = { status: 'published' as const, opensAt: '2026-10-23T12:00:00Z', closesAt: '2026-10-23T13:00:00Z' };
    expect(examAvailability(exam, Date.parse(exam.opensAt) - 1)).toBe('Programado');
    expect(examAvailability(exam, Date.parse(exam.opensAt))).toBe('Activo');
    expect(examAvailability(exam, Date.parse(exam.closesAt))).toBe('Cerrado');
    expect(examAvailability({ ...exam, status: 'draft' }, Date.parse(exam.opensAt))).toBe('Borrador');
  });
  it('recupera la última opción guardada antes del corte y descarta escrituras tardías', () => {
    const event = (id: string, optionId: string, created: string): ExamAnswerEvent => ({ id, optionId, created, attempt: 't', questionId: 'q1', mutationId: id });
    const events = [event('b', 'b', '2026-10-23 12:05:00.000Z'), event('a', 'a', '2026-10-23 12:00:00.000Z'), event('c', 'a', '2026-10-23 13:00:00.000Z')];
    expect(examSelections(events, '2026-10-23T13:00:00Z')).toEqual({ q1: 'b' });
    expect(examScore([question, { ...question, id: 'q2' }], { q1: 'b' })).toEqual({ correct: 1, total: 2, percentage: 50 });
  });
  it('interpreta y muestra horarios de Buenos Aires aunque el servidor use otra zona', () => {
    expect(examDateInput('2026-10-23T19:30')).toBe('2026-10-23T22:30:00.000Z');
    expect(examLocalDate('2026-10-23 22:30:00.000Z')).toBe('2026-10-23T19:30');
  });
});
