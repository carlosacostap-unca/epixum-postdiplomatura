export const COURSE_EXAM_PASS_GRADE = 4;
export const COURSE_EXAM_PROMOTION_GRADE = 7;

export type IntegralGradeAdjustment = { original: number; points: number };

export function validIntegralGradeAdjustment(original: number | null, stored?: IntegralGradeAdjustment | null) {
  return original !== null && stored && stored.original === original &&
    Number.isFinite(stored.points) && stored.points > 0 && original + stored.points <= 10
    ? { original, points: stored.points } : undefined;
}
const dspFirstMakeup = 'dsprec1nov27001';
const fiaSecondMakeup = 'fiarec2nov24001';

export function fiaSecondMakeupPromotionGrade(firstGrade: number | null) {
  return firstGrade === 6.5 ? 7.5 : firstGrade === 6 ? 8 : null;
}

export function fiaSecondMakeupRules(firstGrade: number | null) {
  const promotionGrade = fiaSecondMakeupPromotionGrade(firstGrade);
  if (!promotionGrade) return courseExamApprovalRules(fiaSecondMakeup);
  const regularLimit = firstGrade === 6.5 ? '7' : '7,5';
  return `Con ${promotionGrade.toLocaleString('es-AR')} o más en el recuperatorio, promocionás. Con una nota de 4 a ${regularLimit}, quedás regular. Si no te presentás, quedás libre.`;
}

export function courseExamApprovalRules(examId?: string) {
  if (examId === dspFirstMakeup) return 'Con 6 o más en el recuperatorio, promocionás. Con una nota de 4 a 5,5 o si no te presentás, quedás regular.';
  if (examId === fiaSecondMakeup) return 'Se aprueba con 4. La nota necesaria para promocionar depende de tu nota del primer parcial. Si no te presentás, quedás libre.';
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
  if (examId === fiaSecondMakeup && correct * 10 >= total * COURSE_EXAM_PASS_GRADE) {
    return { code: 'approved', approved: true, label: 'Aprobado', condition: null } as const;
  }
  const promotionGrade = examId === dspFirstMakeup ? 6 : COURSE_EXAM_PROMOTION_GRADE;
  if (correct * 10 >= total * promotionGrade) return outcomes.promote;
  if (correct * 10 >= total * COURSE_EXAM_PASS_GRADE) return outcomes.regularize;
  return outcomes.failed;
}
