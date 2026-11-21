export const COURSE_EXAM_PASS_GRADE = 4;
export const COURSE_EXAM_PROMOTION_GRADE = 7;
const dspFirstMakeup = 'dsprec1nov27001';

export function courseExamApprovalRules(examId?: string) {
  if (examId === dspFirstMakeup) return 'Con 6 o más en el recuperatorio, promocionás. Con una nota de 4 a 5,5 o si no te presentás, quedás regular.';
  return 'Se aprueba con 4. De 4 inclusive a menos de 7: en condiciones de regularizar. Desde 7 inclusive: en condiciones de promocionar.';
}

const outcomes = {
  failed: { code: 'failed', approved: false, label: 'Desaprobado', condition: null },
  regularize: { code: 'regularize', approved: true, label: 'Aprobado', condition: 'En condiciones de regularizar' },
  promote: { code: 'promote', approved: true, label: 'Aprobado', condition: 'En condiciones de promocionar' },
} as const;

/** Compare the exact score, never the rounded percentage or displayed grade. */
export function courseExamOutcome(correct?: number | null, total?: number | null, examId?: string) {
  if (typeof correct !== 'number' || typeof total !== 'number' || !Number.isSafeInteger(correct) || !Number.isSafeInteger(total) || total <= 0 || correct < 0 || correct > total) return null;
  const promotionGrade = examId === dspFirstMakeup ? 6 : COURSE_EXAM_PROMOTION_GRADE;
  if (correct * 10 >= total * promotionGrade) return outcomes.promote;
  if (correct * 10 >= total * COURSE_EXAM_PASS_GRADE) return outcomes.regularize;
  return outcomes.failed;
}
