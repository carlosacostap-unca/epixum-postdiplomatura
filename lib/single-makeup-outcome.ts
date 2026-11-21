import 'server-only';
import { cache } from 'react';
import type PocketBase from 'pocketbase';
import { examSchedule, type CourseExamSummary } from './course-exams';
import { COURSE_EXAM_PASS_GRADE, fiaSecondMakeupPromotionGrade } from './course-exam-grading';
import { createServiceClient } from './pocketbase-service';

const policies = {
  '6taf9vkwwi8oxlz': {
    exam: 'dsprec1nov27001', survey: 'dsppromofinal01', retainedExam: 'dspsecondexam01',
    partial: 'first',
  },
  tceqb7atji66fmd: {
    exam: 'fiarec2nov24001', survey: 'fiapromofinal01', retainedExam: 'fiafirstexam001',
    partial: 'second',
  },
} as const;

type Policy = (typeof policies)[keyof typeof policies];
function forCourse(course: string): Policy | undefined {
  return Object.hasOwn(policies, course) ? policies[course as keyof typeof policies] : undefined;
}

type MakeupCondition = 'regular' | 'free' | 'promoted';

export function singleMakeupCondition(partial: 'first' | 'second', makeup: number | null, retained: number): MakeupCondition | null {
  if (makeup === null) return partial === 'first' ? 'regular' : 'free';
  if (makeup < COURSE_EXAM_PASS_GRADE) return 'free';
  const minimum = partial === 'first' ? 6 : fiaSecondMakeupPromotionGrade(retained);
  if (minimum === null) return null;
  return makeup >= minimum ? 'promoted' : 'regular';
}

type ScheduledExam = Pick<CourseExamSummary, 'opensAt' | 'closesAt' | 'sessions'> & { studentRoster?: { students?: string[] } };
type Result = { exam: string; correct: number; total: number };
const grade = (result?: Result) => result && result.total > 0 ? (result.correct * 10) / result.total : null;

// Only call after verifying the active enrollment and authenticated student.
async function readFinalOutcome(service: PocketBase, course: string, student: string, policy: Policy) {
  const { exam, retainedExam, partial, survey } = policy;
  const scheduled = await service.collection('course_exams').getList<ScheduledExam>(1, 1, {
    filter: service.filter('id = {:exam} && course = {:course} && status = "published"', { exam, course }),
    fields: 'studentRoster,opensAt,closesAt,sessions.id,sessions.label,sessions.opensAt,sessions.closesAt',
  });
  const [record] = scheduled.items;
  if (!record?.studentRoster?.students?.includes(student)) return null;
  const now = Date.now();
  if (!examSchedule(record).every(turn => Date.parse(turn.closesAt.replace(' ', 'T')) <= now)) return null;

  const filter = service.filter('course = {:course} && student = {:student} && (exam = {:exam} || exam = {:retainedExam})', { course, student, exam, retainedExam });
  const results = await service.collection('course_exam_results').getFullList<Result>({ filter, fields: 'exam,correct,total' });
  const retained = grade(results.find(result => result.exam === retainedExam));
  if (retained === null) return null;
  const makeup = results.find(result => result.exam === exam);
  if (!makeup) {
    const attempts = await service.collection('course_exam_attempts').getList(1, 1, {
      filter: service.filter('course = {:course} && student = {:student} && exam = {:exam}', { course, student, exam }),
      fields: 'id',
    });
    if (attempts.items.length) return null;
  }
  const recovered = grade(makeup);
  if (makeup && recovered === null) return null;
  const condition = singleMakeupCondition(partial, recovered, retained);
  if (!condition) return null;
  const grades = condition === 'promoted' && recovered !== null
    ? partial === 'first' ? { first: recovered, second: retained } : { first: retained, second: recovered }
    : null;
  return { condition, grades, survey, recovered };
}

export const getSingleMakeupOutcome = cache(async (course: string, student: string) => {
  const policy = forCourse(course);
  if (!policy) return null;
  return readFinalOutcome(await createServiceClient(), course, student, policy);
});

export async function getSingleMakeupSurveyGrades(service: PocketBase, course: string, survey: string, student: string) {
  const policy = forCourse(course);
  if (!policy || survey !== policy.survey) return null;
  return (await readFinalOutcome(service, course, student, policy))?.grades ?? null;
}
