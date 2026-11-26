import 'server-only';
import { cache } from 'react';
import type PocketBase from 'pocketbase';
import { examSchedule, type CourseExamSummary } from './course-exams';
import { createServiceClient } from './pocketbase-service';
import { readSingleMakeupOutcome } from './single-makeup-outcome';

const courses = {
  '6taf9vkwwi8oxlz': {
    single: ['dsprec1nov27001'], integral: 'dsprecabnov2701', additional: [], originals: ['dspfirstexam001', 'dspsecondexam01'],
    promoted: 'dsppromofinal01', regular: 'dspregularnov01', free: 'dspfreedomnov01',
  },
  tceqb7atji66fmd: {
    single: ['fiarec1nov24001', 'fiarec2nov24001'], integral: 'fiarecabnov2401', additional: ['fiarecabnov2501'], originals: ['fiafirstexam001', 'fiasecondexam01'],
    promoted: 'fiapromofinal01', regular: 'fiaregularnov01', free: 'fiafreedomnov01',
  },
} as const;

type Condition = 'regular' | 'free' | 'promoted';
type Feedback = { condition: Condition; survey: string; recovered: number | null; assigned: boolean; integralGrade?: number; adjustment?: { original: number; points: number } };
type Exam = Pick<CourseExamSummary, 'id' | 'opensAt' | 'closesAt' | 'sessions'> & {
  status: string;
  studentRoster?: { students?: string[] };
};

export function integralCondition(grade: number | null): Condition {
  if (grade === null || grade < 4) return 'free';
  return grade >= 7 ? 'promoted' : 'regular';
}

// Call with the authenticated student ID after checking their enrollment.
export const readFinalFeedback = cache(async (service: PocketBase, course: string, student: string): Promise<Feedback | null> => {
  if (!Object.hasOwn(courses, course)) return null;
  const policy = courses[course as keyof typeof courses];
  const standard = [...policy.single, policy.integral] as string[];
  const examIds = [...standard, ...policy.additional].map(exam => service.filter('id = {:exam}', { exam })).join(' || ');
  const records = await service.collection('course_exams').getFullList<Exam>({
    filter: service.filter('course = {:course}', { course }) + ` && (${examIds})`,
    fields: 'id,status,studentRoster,opensAt,closesAt,sessions.id,sessions.label,sessions.opensAt,sessions.closesAt',
  });
  if (!standard.every(id => records.some(exam => exam.id === id))) return null;
  const exams = records.filter(exam => standard.includes(exam.id) || exam.studentRoster?.students?.includes(student));
  if (exams.some(exam => exam.status !== 'published' && exam.status !== 'archived')) return null;
  const now = Date.now();
  if (exams.some(exam => examSchedule(exam).some(turn => !(Date.parse(turn.closesAt.replace(' ', 'T')) <= now)))) return null;
  const examFilter = exams.map(row => service.filter('exam = {:exam}', { exam: row.id })).join(' || ');
  const scope = service.filter('course = {:course}', { course });
  const unfinished = await service.collection('course_exam_attempts').getList(1, 1, {
    filter: scope + ` && (${examFilter}) && course_exam_results_via_attempt.id = ""`, fields: 'id',
  });
  if (unfinished.items.length) return null;

  const assigned = exams.find(exam => exam.studentRoster?.students?.includes(student));
  if (assigned && (policy.single as readonly string[]).includes(assigned.id)) {
    const final = await readSingleMakeupOutcome(service, course, student);
    return final && { condition: final.condition, recovered: final.recovered, survey: policy[final.condition], assigned: true };
  }
  const requested = assigned ? [assigned.id] : policy.originals;
  const resultFilter = requested.map(exam => service.filter('exam = {:exam}', { exam })).join(' || ');
  const results = await service.collection('course_exam_results').getFullList<{ correct: number; total: number; integralGradeAdjustment?: { points: number; original: number } | null }>({
    filter: service.filter('course = {:course} && student = {:student}', { course, student }) + ` && (${resultFilter})`,
    fields: 'correct,total,integralGradeAdjustment',
  });
  if (!assigned && results.length) return null;
  const [result] = results;
  if (results.length > 1 || (result && result.total <= 0)) return null;
  const original = result ? (10 * result.correct) / result.total : null;
  const stored = result?.integralGradeAdjustment;
  const adjustment = original !== null && stored && stored.original === original &&
    Number.isFinite(stored.points) && stored.points > 0 && original + stored.points <= 10
    ? { original, points: stored.points } : undefined;
  const recovered = adjustment ? adjustment.original + adjustment.points : original;
  const condition = integralCondition(recovered);
  return {
    condition, recovered, survey: policy[condition], assigned: Boolean(assigned),
    ...(condition === 'promoted' && recovered !== null ? { integralGrade: recovered, adjustment } : {}),
  };
});

export const getFinalMakeupFeedback = cache(async (course: string, student: string) => {
  if (!Object.hasOwn(courses, course)) return null;
  return readFinalFeedback(await createServiceClient(), course, student);
});

export function isFinalMakeupSurvey(course: string, survey: string, condition: 'regular' | 'free') {
  return Object.hasOwn(courses, course) && courses[course as keyof typeof courses][condition] === survey;
}

export function isIntegralPromotionSurvey(course: string, survey: string) {
  return Object.hasOwn(courses, course) && courses[course as keyof typeof courses].promoted === survey;
}
