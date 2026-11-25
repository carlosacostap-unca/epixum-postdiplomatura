import 'server-only';
import { cache } from 'react';
import { readPendingMakeup } from './course-makeup-notice';

import { fiaCourseId } from './fia-degree';
export { fiaCourseId } from './fia-degree';
const makeups: Record<string, string> = {
  fiarec1nov24001: 'el primer parcial',
  fiarec2nov24001: 'el segundo parcial',
  fiarecabnov2401: 'ambos parciales',
  fiarecabnov2501: 'ambos parciales',
};

export function isFiaMakeup(course: string, exam: string) {
  return course === fiaCourseId && Object.hasOwn(makeups, exam);
}

// The caller supplies the authenticated student. Return only that student's grades.
export const getPendingFiaMakeup = cache(async (course: string, student: string) => {
  if (course !== fiaCourseId) return null;
  return readPendingMakeup(course, student, makeups, ['fiafirstexam001', 'fiasecondexam01']);
});
