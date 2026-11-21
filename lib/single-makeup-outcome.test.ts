import { afterEach, expect, it, vi } from 'vitest';
import type PocketBase from 'pocketbase';
import { getSingleMakeupSurveyGrades, singleMakeupCondition } from './single-makeup-outcome';

afterEach(() => vi.useRealTimers());

it.each([
  ['first', null, 8, 'regular'],
  ['first', 3.5, 10, 'free'],
  ['first', 4, 8, 'regular'],
  ['first', 5.5, 9.5, 'regular'],
  ['first', 6, 8, 'promoted'],
  ['second', null, 6, 'free'],
  ['second', 3.5, 6.5, 'free'],
  ['second', 4, 6, 'regular'],
  ['second', 7, 6.5, 'regular'],
  ['second', 7.5, 6.5, 'promoted'],
  ['second', 7.5, 6, 'regular'],
  ['second', 8, 6, 'promoted'],
] as const)('clasifica %s con recuperatorio %s y nota conservada %s', (partial, recovered, retained, condition) => {
  expect(singleMakeupCondition(partial, recovered, retained)).toBe(condition);
});

it('habilita únicamente la encuesta del curso para la cuenta asignada después del último turno', async () => {
  vi.useFakeTimers();
  const course = 'tceqb7atji66fmd', survey = 'fiapromofinal01';
  const exam = {
    studentRoster: { students: ['assigned'] },
    opensAt: '2026-11-24T08:00:00-03:00', closesAt: '2026-11-24T09:00:00-03:00',
    sessions: [{ id: 'noche', label: 'Noche', opensAt: '2026-11-24T20:00:00-03:00', closesAt: '2026-11-24T21:00:00-03:00' }],
  };
  const results = vi.fn(async () => [
    { exam: 'fiafirstexam001', correct: 13, total: 20 },
    { exam: 'fiarec2nov24001', correct: 15, total: 20 },
  ]);
  const service = {
    filter: (_: string, values: unknown) => JSON.stringify(values),
    collection: (name: string) => name === 'course_exams'
      ? { getList: async () => ({ items: [exam] }) }
      : { getFullList: results },
  } as unknown as PocketBase;
  vi.setSystemTime(new Date('2026-11-24T09:01:00-03:00'));
  expect(await getSingleMakeupSurveyGrades(service, course, survey, 'assigned')).toBeNull();
  expect(results).not.toHaveBeenCalled();
  vi.setSystemTime(new Date('2026-11-24T21:01:00-03:00'));
  expect(await getSingleMakeupSurveyGrades(service, course, 'other-survey', 'assigned')).toBeNull();
  expect(await getSingleMakeupSurveyGrades(service, course, survey, 'other-student')).toBeNull();
  expect(results).not.toHaveBeenCalled();
  expect(await getSingleMakeupSurveyGrades(service, course, survey, 'assigned')).toEqual({ first: 6.5, second: 7.5 });
  expect(results).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.stringContaining('"student":"assigned"') }));
});
