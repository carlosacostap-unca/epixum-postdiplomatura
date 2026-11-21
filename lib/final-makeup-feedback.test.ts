import type PocketBase from 'pocketbase';
import { afterEach, expect, it, vi } from 'vitest';
import { integralCondition, isFinalMakeupSurvey, readFinalFeedback } from './final-makeup-feedback';

afterEach(() => vi.useRealTimers());

it.each([[null, 'free'], [3.5, 'free'], [4, 'regular'], [6.5, 'regular'], [7, 'promoted']] as const)(
  'clasifica el recuperatorio integral con nota %s', (grade, condition) => {
    expect(integralCondition(grade)).toBe(condition);
  },
);

it('espera todos los turnos y entregas y devuelve sólo la encuesta de la condición definitiva', async () => {
  vi.useFakeTimers();
  const course = '6taf9vkwwi8oxlz';
  const schedule = { status: 'published', opensAt: '2026-11-27T15:00:00-03:00', closesAt: '2026-11-27T16:00:00-03:00' };
  const exams = [
    { id: 'dsprec1nov27001', ...schedule },
    { id: 'dsprecabnov2701', ...schedule, studentRoster: { students: ['student'] }, sessions: [{ id: 'noche', label: 'Noche', opensAt: '2026-11-27T20:00:00-03:00', closesAt: '2026-11-27T21:00:00-03:00' }] },
  ];
  const results = vi.fn().mockResolvedValue([{ correct: 10, total: 20 }]);
  const pending = vi.fn().mockResolvedValue({ items: [{ id: 'attempt' }] });
  const service = {
    filter: (criteria: string, parameters: object) => criteria + JSON.stringify(parameters),
    collection: (name: string) => ({
      course_exams: { getFullList: async () => exams },
      course_exam_attempts: { getList: pending },
      course_exam_results: { getFullList: results },
    })[name],
  } as unknown as PocketBase;

  vi.setSystemTime(new Date('2026-11-27T20:59:00-03:00'));
  expect(await readFinalFeedback(service, course, 'student')).toBeNull();
  expect(pending).not.toHaveBeenCalled();
  vi.setSystemTime(new Date('2026-11-27T21:01:00-03:00'));
  expect(await readFinalFeedback(service, course, 'student')).toBeNull();
  expect(results).not.toHaveBeenCalled();
  pending.mockResolvedValue({ items: [] });
  expect(await readFinalFeedback(service, course, 'student')).toMatchObject({ condition: 'regular', survey: 'dspregularnov01', recovered: 5 });
  expect(results).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.stringContaining('"student":"student"') }));
  results.mockResolvedValue([{ correct: 15, total: 20 }]);
  expect(await readFinalFeedback(service, course, 'student')).toMatchObject({ condition: 'promoted', survey: 'dsppromofinal01', integralGrade: 7.5 });
  results.mockResolvedValue([]);
  expect(await readFinalFeedback(service, course, 'unassigned')).toMatchObject({ condition: 'free', survey: 'dspfreedomnov01', assigned: false });
  expect(isFinalMakeupSurvey(course, 'dspfreedomnov01', 'free')).toBe(true);
  expect(isFinalMakeupSurvey(course, 'fiafreedomnov01', 'free')).toBe(false);
});
