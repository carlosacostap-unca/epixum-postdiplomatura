const firstPartial = [
  { quizId: 'tl4b9pb7e7gqz3f', label: 'Preparación de la unidad 1' },
  { quizId: 'mh23hheij070ihr', label: 'Preparación de la unidad 2' },
  { quizId: 'os879pp9uhqfb4r', label: 'Preparación de la unidad 3' },
  { quizId: 'qozqi36bw5qepfw', label: 'Simulación del primer parcial' },
];
const secondPartial = [
  { quizId: 'fiaunit4prep001', label: 'Preparación de la unidad 4' },
  { quizId: 'fiaunit5prep001', label: 'Preparación de la unidad 5' },
  { quizId: 'nqcx3so0zz4o86y', label: 'Simulación del segundo parcial' },
];

export function examRequirements(courseId: string, examId: string) {
  if (courseId === '6taf9vkwwi8oxlz' && examId === 'dspsecondexam01') return [
    { quizId: 'dspunit5prep001', label: 'Preparación de la unidad 5' },
    { quizId: 'dspunit6prep001', label: 'Preparación de la unidad 6' },
    { quizId: 'javvc3ngddo3ow2', label: 'Simulación del segundo parcial' },
  ];
  if (courseId !== 'tceqb7atji66fmd') return [];
  switch (examId) {
    case 'fiarec1nov24001': return firstPartial;
    case 'fiasecondexam01':
    case 'fiarec2nov24001': return secondPartial;
    case 'fiarecabnov2401': return [...firstPartial, ...secondPartial];
    default: return [];
  }
}
export type ExamRequirementProgress = { quizId: string; label: string; completed: boolean };
