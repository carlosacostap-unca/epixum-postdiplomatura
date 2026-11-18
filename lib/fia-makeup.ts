import 'server-only';
import { cache } from 'react';
import { createServiceClient } from './pocketbase-service';

export const fiaCourseId = 'tceqb7atji66fmd';
const makeups: Record<string, string> = {
  fiarec1nov24001: 'el primer parcial',
  fiarec2nov24001: 'el segundo parcial',
  fiarecabnov2401: 'ambos parciales',
};

// The caller supplies the authenticated student. Return only that student's grades.
export const getPendingFiaMakeup = cache(async (course: string, student: string) => {
  if (course !== fiaCourseId) return null;
  const pb = await createServiceClient();
  const filter = pb.filter('course = {:course} && status = "published"', { course });
  const exams = await pb.collection('course_exams').getFullList<{
    id: string; studentRoster?: { students?: string[] };
  }>({ filter, fields: 'id,studentRoster' });
  const exam = exams.find(row => Object.hasOwn(makeups, row.id) && row.studentRoster?.students?.includes(student));
  if (!exam) return null;
  const results = await pb.collection('course_exam_results').getFullList<{ exam: string; correct: number; total: number }>({
    filter: pb.filter('course = {:course} && student = {:student}', { course, student }),
    fields: 'exam,correct,total',
  });
  if (results.some(result => result.exam === exam.id)) return null;
  const grade = (id: string) => {
    const result = results.find(row => row.exam === id);
    return result && result.total > 0 ? 10 * result.correct / result.total : null;
  };
  return { examId: exam.id, subject: makeups[exam.id], first: grade('fiafirstexam001'), second: grade('fiasecondexam01') };
});
