import { expect, it } from 'vitest';
import { examSchedule, primaryExamSessionLabel } from './course-exams';
it('nombra el turno principal según la hora argentina y mantiene los alternativos', () => {
  const schedule = examSchedule({ opensAt: '2026-11-20 18:00:00.000Z', closesAt: '2026-11-20 19:00:00.000Z', sessions: [{ id: 'noche', label: 'Turno noche', opensAt: '2026-11-20T20:00:00-03:00', closesAt: '2026-11-20T21:00:00-03:00' }] });
  expect(schedule.map(s => s.label)).toEqual(['Turno tarde', 'Turno noche']);
  expect(primaryExamSessionLabel('2026-11-17T11:00:00Z')).toBe('Turno mañana');
  expect(primaryExamSessionLabel('2026-11-20T20:00:00-03:00')).toBe('Turno noche');
  expect(primaryExamSessionLabel('')).toBe('Turno mañana');
});
