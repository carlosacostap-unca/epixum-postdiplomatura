import { describe, expect, it } from 'vitest';
import { generateReviewSlots, reviewEvaluationSchema, reviewDate, type ReviewBlockInput } from './review-appointments';

const input: ReviewBlockInput = { teacher: 'teacher00000001', date: '2026-10-20', start: '18:00', end: '19:00', duration: 15, breakEvery: 2, breakMinutes: 10 };
describe('agenda de revisiones', () => {
  it('genera horarios de Argentina, descansos intermedios y omite el resto parcial', () => {
    const result = generateReviewSlots(input);
    expect(result.slots.map(s => s.startsAt)).toEqual(['2026-10-20T21:00:00.000Z', '2026-10-20T21:15:00.000Z', '2026-10-20T21:40:00.000Z']);
    expect(result.breaks).toHaveLength(1);
    expect(result.slots[2].endsAt).toBe('2026-10-20T21:55:00.000Z');
    expect(reviewDate(result.slots[0].startsAt, true)).toBe('18:00');
  });
  it('sin descansos incluye el turno que termina exactamente en el límite', () => {
    expect(generateReviewSlots({ ...input, breakEvery: 0, breakMinutes: 0 }).slots).toHaveLength(4);
  });
  it('no agrega descanso al terminar la franja', () => {
    const result = generateReviewSlots({ ...input, end: '18:30' });
    expect(result.slots).toHaveLength(2); expect(result.breaks).toHaveLength(0);
  });
  it.each([
    { date: '2026-02-30' }, { start: '20:00' }, { end: '18:00' }, { duration: 0 }, { duration: 90 },
    { breakEvery: 0 }, { breakMinutes: 0 }, { start: '25:00' }, { start: '00:00', end: '23:59', duration: 5, breakEvery: 0, breakMinutes: 0 },
  ])('rechaza configuración inválida %j', patch => {
    expect(() => generateReviewSlots({ ...input, ...patch })).toThrow();
  });
  it('no permite aprobar un ausente', () => {
    expect(reviewEvaluationSchema.safeParse({ attendance: 'absent', status: 'passed', feedback: '' }).success).toBe(false);
    expect(reviewEvaluationSchema.safeParse({ attendance: 'absent', status: 'not_passed', feedback: '' }).success).toBe(true);
  });
});
