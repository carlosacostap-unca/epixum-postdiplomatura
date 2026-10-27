import { describe, expect, it } from 'vitest';
import { activeExamSession, courseExamSchema, examAvailability, examDateInput, examLocalDate, examScore, examSelections, examSummary, visibleExamResult, type ExamAnswerEvent } from './course-exams';
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
  it('libera nota y corrección completa exactamente al cierre y no incluye claves ni puntajes antes', () => {
    const deadline = '2026-10-23 13:00:00.000Z';
    const attempt = { deadline, snapshot: courseExamSchema.parse({ ...draft, questions: [{ ...question, explanation: 'Explicación reservada' }, { ...question, id: 'q2' }] }) };
    const result = { id: 'result', attempt: 'attempt', finishedAt: '2026-10-23 12:30:00.000Z', reason: 'submitted' as const, correct: 1, total: 2, percentage: 50, selected: { q1: 'b' } };
    const before = visibleExamResult(result, attempt, 'student', Date.parse(deadline) - 1);
    expect(before).toEqual({ id: 'result', attempt: 'attempt', finishedAt: result.finishedAt, reason: 'submitted', selected: { q1: 'b' }, feedbackAvailable: false });
    expect(JSON.stringify(before)).not.toMatch(/correct|percentage|total|review|Explicación reservada/);
    const after = visibleExamResult(result, attempt, 'student', Date.parse(deadline));
    expect(after).toMatchObject({ feedbackAvailable: true, correct: 1, total: 2, review: [{ selectedOptionId: 'b', correct: true }, { selectedOptionId: null, correct: false }] });
    expect(JSON.stringify(after)).toContain('Explicación reservada');
    expect(visibleExamResult(result, attempt, 'manage', Date.parse(deadline) - 1).feedbackAvailable).toBe(true);
  });
});

describe('turnos de un mismo parcial', () => {
  const exam = { ...draft, id: 'exam', course: 'course', status: 'published' as const, opensAt: '2026-10-28T11:00:00Z', closesAt: '2026-10-28T12:00:00Z', sessions: [{ id: 'night', label: 'Turno noche', opensAt: '2026-10-28T23:00:00Z', closesAt: '2026-10-29T00:00:00Z', questions: [{ ...question, id: 'night-q', prompt: 'Pregunta nocturna privada' }] }] };
  it('abre cada versión en su ventana y permanece programado entre turnos', () => {
    expect(activeExamSession(exam, Date.parse(exam.opensAt))?.questions[0].id).toBe('q1');
    expect(activeExamSession(exam, Date.parse(exam.closesAt))).toBeNull();
    expect(examAvailability(exam, Date.parse(exam.closesAt))).toBe('Programado');
    expect(activeExamSession(exam, Date.parse(exam.sessions[0].opensAt))?.questions[0].id).toBe('night-q');
    expect(examAvailability(exam, Date.parse(exam.sessions[0].closesAt))).toBe('Cerrado');
    expect(examAvailability({ ...exam, status: 'draft' }, Date.parse(exam.sessions[0].opensAt))).toBe('Borrador');
  });
  it('rechaza turnos solapados, incompletos, repetidos o con distinta cantidad de preguntas', () => {
    const input = { ...draft, status: exam.status, opensAt: exam.opensAt, closesAt: exam.closesAt, sessions: exam.sessions };
    expect(courseExamSchema.safeParse(input).success).toBe(true);
    expect(courseExamSchema.safeParse({ ...input, sessions: [{ ...exam.sessions[0], opensAt: '2026-10-28T11:30:00Z' }] }).success).toBe(false);
    expect(courseExamSchema.safeParse({ ...input, sessions: [{ ...exam.sessions[0], closesAt: '' }] }).success).toBe(false);
    expect(courseExamSchema.safeParse({ ...input, sessions: [{ ...exam.sessions[0], questions: [] }] }).success).toBe(false);
    expect(courseExamSchema.safeParse({ ...input, sessions: [{ ...exam.sessions[0], questions: [question] }] }).success).toBe(false);
    expect(courseExamSchema.safeParse({ ...input, sessions: [exam.sessions[0], exam.sessions[0]] }).success).toBe(false);
  });
  it('expone los horarios sin serializar preguntas ni claves de ningún turno', () => {
    const summary = examSummary(exam);
    expect(summary.sessions).toEqual([{ id: 'night', label: 'Turno noche', opensAt: exam.sessions[0].opensAt, closesAt: exam.sessions[0].closesAt }]);
    expect(JSON.stringify(summary)).not.toMatch(/questions|correctOptionId|explanation|Pregunta nocturna/);
  });
});
