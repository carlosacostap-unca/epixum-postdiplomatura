/** This announced policy applies only to this course and exam, not to other assessments. */
export function examRequirements(courseId: string, examId: string) {
  if (courseId === '6taf9vkwwi8oxlz' && examId === 'dspsecondexam01') return [
    { quizId: 'dspunit5prep001', label: 'Preparación de la unidad 5' },
    { quizId: 'dspunit6prep001', label: 'Preparación de la unidad 6' },
    { quizId: 'javvc3ngddo3ow2', label: 'Simulación del segundo parcial' },
  ];
  return courseId === 'tceqb7atji66fmd' && examId === 'fiasecondexam01' ? [
    { quizId: 'fiaunit4prep001', label: 'Preparación de la unidad 4' },
    { quizId: 'fiaunit5prep001', label: 'Preparación de la unidad 5' },
    { quizId: 'nqcx3so0zz4o86y', label: 'Simulación del segundo parcial' },
  ] : [];
}
export type ExamRequirementProgress = { quizId: string; label: string; completed: boolean };
