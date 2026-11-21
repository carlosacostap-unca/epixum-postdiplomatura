import 'server-only';
import { createServiceClient } from './pocketbase-service';
import type { CourseExamSummary } from './course-exams';

type MakeupExam = Pick<CourseExamSummary, 'id' | 'opensAt' | 'closesAt' | 'sessions'> & {
  studentRoster?: { students?: string[] } | null;
};

// Use the authenticated student's ID after the course page checks enrollment.
export async function readPendingMakeup(course: string, student: string, makeups: Record<string, string>, originals: readonly [string, string]) {
  const pb = await createServiceClient();
  const filter = pb.filter('course = {:course} && status = "published"', { course });
  const exams = await pb.collection('course_exams').getFullList<MakeupExam>({
    filter, fields: 'id,studentRoster,opensAt,closesAt,sessions.id,sessions.label,sessions.opensAt,sessions.closesAt',
  });
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
  const { id, opensAt, closesAt, sessions } = exam;
  return { examId: id, subject: makeups[id], first: grade(originals[0]), second: grade(originals[1]), schedule: { opensAt, closesAt, sessions } };
}

const dspMakeups = {
  dsprec1nov27001: 'el primer parcial',
  dsprecabnov2701: 'ambos parciales',
};

export function getPendingDspMakeup(course: string, student: string) {
  if (course !== '6taf9vkwwi8oxlz') return null;
  return readPendingMakeup(course, student, dspMakeups, ['dspfirstexam001', 'dspsecondexam01']);
}
