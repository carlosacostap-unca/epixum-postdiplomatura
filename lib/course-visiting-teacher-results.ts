import 'server-only';
import type PocketBase from 'pocketbase';
import { validIntegralGradeAdjustment, type IntegralGradeAdjustment } from '@/lib/course-exam-grading';
import { examSelections, type ExamAnswerEvent } from '@/lib/course-exams';
import { requireVisitingTeacherAssignment } from '@/lib/course-visiting-teacher-access';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { practiceDeadline, practiceGrade, type PracticeAnswer, type PublicPracticeQuestion, type PracticeResult } from '@/lib/preparation';

const assessments = {
  preparacion: {
    feature: 'preparationEnabled', activity: 'practice_quizzes', relation: 'quiz',
    attempts: 'practice_attempts', results: 'practice_results',
  },
  parciales: {
    feature: 'examsEnabled', activity: 'course_exams', relation: 'exam',
    attempts: 'course_exam_attempts', results: 'course_exam_results',
  },
} as const;

export type VisitingAssessmentKind = keyof typeof assessments;

type Attempt = {
  id: string;
  student: string;
  created: string;
  deadline?: string;
  snapshot?: { durationMinutes?: number; questions?: PublicPracticeQuestion[] };
  expand?: { student?: { name?: string; firstName?: string; lastName?: string } };
};
type StoredResult = {
  attempt: string;
  student: string;
  created?: string;
  finishedAt?: string;
  correct: number;
  total: number;
  reason?: 'submitted' | 'expired';
  completionReason?: PracticeResult['completionReason'];
  integralGradeAdjustment?: IntegralGradeAdjustment | null;
  selected?: Record<string, string> | null;
  review?: { question: { id: string }; selectedOptionId: string | null }[] | null;
};

const attemptFields = 'id,student,created,expand.student.name,expand.student.firstName,expand.student.lastName';

function deadlineFor(attempt: Attempt) {
  return attempt.deadline || (attempt.snapshot?.durationMinutes
    ? practiceDeadline({ created: attempt.created, snapshot: { durationMinutes: attempt.snapshot.durationMinutes } }) : null);
}

function historyRow(attempt: Attempt, result: StoredResult | undefined, kind: VisitingAssessmentKind) {
  const student = attempt.expand?.student;
  const original = result && result.total > 0 ? (10 * result.correct) / result.total : null;
  const adjustment = kind === 'parciales' ? validIntegralGradeAdjustment(original, result?.integralGradeAdjustment) : undefined;
  const grade = kind === 'preparacion' && result ? practiceGrade(result.correct, result.total)
    : adjustment ? adjustment.original + adjustment.points : original;
  const deadline = deadlineFor(attempt);
  const finishedAt = result?.finishedAt || result?.created || null;
  const state = result
    ? result.reason === 'expired' || result.completionReason === 'time_expired' ? 'Cerrado por tiempo' : 'Finalizado'
    : deadline && Date.parse(deadline.replace(' ', 'T')) <= Date.now() ? 'Pendiente de cierre' : 'En curso';
  return {
    id: attempt.id, studentName: student?.name || [student?.firstName, student?.lastName].filter(Boolean).join(' ') || 'Alumno sin nombre',
    created: attempt.created, finishedAt, deadline, state, grade,
    score: result ? { correct: result.correct, total: result.total } : null,
    adjusted: Boolean(adjustment),
  };
}

async function readSelections(service: PocketBase, kind: VisitingAssessmentKind, courseId: string, attempt: Attempt, result: StoredResult | undefined) {
  if (kind === 'parciales' && result?.selected) return result.selected;
  if (kind === 'preparacion' && Array.isArray(result?.review)) {
    return Object.fromEntries(result.review.map(row => [row.question.id, row.selectedOptionId]));
  }
  const filter = service.filter('course = {:courseId} && attempt = {:attemptId} && student = {:student}', {
    courseId, attemptId: attempt.id, student: attempt.student,
  });
  if (kind === 'parciales') {
    const events = await service.collection('course_exam_answers').getFullList<ExamAnswerEvent>({
      filter, fields: 'id,created,questionId,optionId',
    });
    return examSelections(events, attempt.deadline?.replace(' ', 'T') || '');
  }
  const deadline = deadlineFor(attempt);
  const answers = await service.collection('practice_answers').getFullList<PracticeAnswer>({
    filter: filter + (deadline ? service.filter(' && created <= {:deadline}', { deadline: deadline.replace('T', ' ') }) : ''),
    fields: 'questionId,selectedOptionId',
  });
  return Object.fromEntries(answers.map(answer => [answer.questionId, answer.selectedOptionId]));
}

export async function getVisitingTeacherResults(courseId: string, kind: VisitingAssessmentKind, activityId: string, page = 1, attemptId?: string) {
  await requireVisitingTeacherAssignment(await createServerClient(), courseId);
  const assessment = assessments[kind];
  const service = await createServiceClient();
  const course = await service.collection('courses').getOne<{ title: string; preparationEnabled?: boolean; examsEnabled?: boolean }>(courseId, { fields: `title,${assessment.feature}` });
  if (!course[assessment.feature]) throw Object.assign(new Error('La actividad no está habilitada en este curso.'), { status: 404 });
  const activity = await service.collection(assessment.activity).getFirstListItem<{ id: string; title: string }>(
    service.filter('id = {:activityId} && course = {:courseId}', { activityId, courseId }), { fields: 'id,title' },
  );
  const scope = service.filter(`course = {:courseId} && ${assessment.relation} = {:activityId}`, { courseId, activityId });
  const fields = `${attemptFields},${kind === 'parciales' ? 'deadline' : 'snapshot.durationMinutes'}`;
  const attempts = attemptId
    ? { items: [await service.collection(assessment.attempts).getFirstListItem<Attempt>(
      scope + service.filter(' && id = {:attemptId}', { attemptId }),
      { fields: `${fields},snapshot.questions.id,snapshot.questions.prompt,snapshot.questions.options`, expand: 'student' },
    )], page, totalPages: 0, totalItems: 1 }
    : await service.collection(assessment.attempts).getList<Attempt>(page, 25, { filter: scope, fields, expand: 'student', sort: '-created,-id' });

  const resultFields = kind === 'parciales' ? 'reason,integralGradeAdjustment' : 'created,completionReason';
  const resultDetails = kind === 'parciales' ? 'selected' : 'review.question.id,review.selectedOptionId';
  const ids = attempts.items.map(attempt => service.filter('attempt = {:id}', { id: attempt.id })).join(' || ');
  const results = ids ? await service.collection(assessment.results).getFullList<StoredResult>({
    filter: service.filter(`course = {:courseId} && attempt.${assessment.relation} = {:activityId}`, { courseId, activityId }) + ` && (${ids})`,
    fields: `attempt,student,correct,total,finishedAt,${resultFields}${attemptId ? `,${resultDetails}` : ''}`,
  }) : [];
  const byAttempt = new Map(results.map(result => [result.attempt, result]));
  const matchingResult = (attempt: Attempt) => {
    const result = byAttempt.get(attempt.id);
    return result?.student === attempt.student ? result : undefined;
  };

  const base = { courseTitle: course.title, title: activity.title };
  if (attemptId) {
    const attempt = attempts.items[0];
    const result = matchingResult(attempt);
    const selected = await readSelections(service, kind, courseId, attempt, result);
    const questions = (attempt.snapshot?.questions || []).map(question => ({
      id: question.id, prompt: question.prompt,
      answer: question.options.find(option => option.id === selected[question.id])?.label ?? null,
    }));
    return { ...base, detail: { ...historyRow(attempt, result, kind), questions } };
  }
  return {
    ...base, detail: null, page: attempts.page, totalPages: attempts.totalPages, totalItems: attempts.totalItems,
    rows: attempts.items.map(attempt => historyRow(attempt, matchingResult(attempt), kind)),
  };
}
