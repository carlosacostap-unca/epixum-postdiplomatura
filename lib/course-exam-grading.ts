export const COURSE_EXAM_PASS_GRADE = 4;
export const COURSE_EXAM_PROMOTION_GRADE = 7;
export const COURSE_EXAM_APPROVAL_RULES = 'Se aprueba con 4. De 4 inclusive a menos de 7: en condiciones de regularizar. Desde 7 inclusive: en condiciones de promocionar.';

const outcomes = {
  failed: { code: 'failed', approved: false, label: 'Desaprobado', condition: null },
  regularize: { code: 'regularize', approved: true, label: 'Aprobado', condition: 'En condiciones de regularizar' },
  promote: { code: 'promote', approved: true, label: 'Aprobado', condition: 'En condiciones de promocionar' },
} as const;

/** Compare the exact score, never the rounded percentage or displayed grade. */
export function courseExamOutcome(correct?: number | null, total?: number | null) {
  if (typeof correct !== 'number' || typeof total !== 'number' || !Number.isSafeInteger(correct) || !Number.isSafeInteger(total) || total <= 0 || correct < 0 || correct > total) return null;
  if (correct * 10 >= total * COURSE_EXAM_PROMOTION_GRADE) return outcomes.promote;
  if (correct * 10 >= total * COURSE_EXAM_PASS_GRADE) return outcomes.regularize;
  return outcomes.failed;
}
