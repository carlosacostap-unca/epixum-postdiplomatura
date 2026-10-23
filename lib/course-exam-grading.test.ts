import { expect, it } from 'vitest';
import { courseExamOutcome } from './course-exam-grading';

it.each([
  [0, 20, 'failed'], [7, 20, 'failed'], [8, 20, 'regularize'],
  [13, 20, 'regularize'], [14, 20, 'promote'], [20, 20, 'promote'],
])('clasifica %i de %i aciertos como %s, incluidos los límites 4 y 7', (correct, total, code) => {
  const outcome = courseExamOutcome(correct, total);
  expect(outcome?.code).toBe(code); expect(outcome?.approved).toBe(correct >= 8);
});
it('compara el puntaje exacto sin aprobar o promocionar por el porcentaje redondeado', () => {
  expect(Math.round(31 / 78 * 100)).toBe(40); expect(courseExamOutcome(31, 78)?.code).toBe('failed');
  expect(Math.round(23 / 33 * 100)).toBe(70); expect(courseExamOutcome(23, 33)?.code).toBe('regularize');
});
it.each([[null, null], [undefined, undefined], [0, 0], [NaN, 20], [-1, 20], [21, 20], [1.5, 20]])('no asigna una condición a puntajes ausentes o inválidos (%s, %s)', (correct, total) => {
  expect(courseExamOutcome(correct, total)).toBeNull();
});
