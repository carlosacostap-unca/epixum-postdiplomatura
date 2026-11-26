import { beforeEach, expect, it, vi } from 'vitest';
import { getVisitingTeacherResults } from './course-visiting-teacher-results';

const mocks = vi.hoisted(() => ({
  requireAssignment: vi.fn(), createService: vi.fn(), collection: vi.fn(),
  filter: vi.fn((expression: string, values: object) => `${expression} ${JSON.stringify(values)}`),
  course: { title: 'Curso asignado', preparationEnabled: true, examsEnabled: true },
  getActivity: vi.fn(), getAttempt: vi.fn(), listAttempts: vi.fn(), listResults: vi.fn(), listAnswers: vi.fn(),
}));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({}) }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: mocks.createService }));
vi.mock('./course-visiting-teacher-access', () => ({ requireVisitingTeacherAssignment: mocks.requireAssignment }));

const created = '2026-11-10 12:00:00.000Z';
const finishedAt = '2026-11-10 12:10:00.000Z';
const attempt = { id: 'attempt-a', student: 'student-a', created, expand: { student: { name: 'Ana Pérez', email: 'private@example.com' } } };
const question = { id: 'q1', prompt: '¿Qué es un modelo?', options: [{ id: 'a', label: 'Respuesta de Ana' }, { id: 'b', label: 'Opción reservada' }], correctOptionId: 'b', explanation: 'Explicación reservada' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.course.preparationEnabled = true;
  mocks.course.examsEnabled = true;
  mocks.requireAssignment.mockResolvedValue(undefined);
  mocks.createService.mockResolvedValue({ collection: mocks.collection, filter: mocks.filter });
  mocks.getActivity.mockResolvedValue({ id: 'activity-a', title: 'Evaluación' });
  mocks.getAttempt.mockResolvedValue({ ...attempt, snapshot: { questions: [question] } });
  mocks.listAttempts.mockResolvedValue({ items: [attempt], page: 2, totalPages: 2, totalItems: 26 });
  mocks.listResults.mockResolvedValue([]);
  mocks.listAnswers.mockResolvedValue([]);
  mocks.collection.mockImplementation(name => {
    if (name === 'courses') return { getOne: async () => mocks.course };
    if (name.endsWith('_quizzes') || name === 'course_exams') return { getFirstListItem: mocks.getActivity };
    if (name.endsWith('_attempts')) return { getList: mocks.listAttempts, getFirstListItem: mocks.getAttempt };
    if (name.endsWith('_results')) return { getFullList: mocks.listResults };
    if (name.endsWith('_answers')) return { getFullList: mocks.listAnswers };
    throw new Error(`Colección inesperada ${name}`);
  });
});

it('comprueba la asignación antes de acceder a datos de evaluación', async () => {
  mocks.requireAssignment.mockRejectedValue({ status: 404 });
  await expect(getVisitingTeacherResults('foreign', 'preparacion', 'activity-a')).rejects.toMatchObject({ status: 404 });
  expect(mocks.createService).not.toHaveBeenCalled();
});

it('rechaza una evaluación deshabilitada y no consulta intentos', async () => {
  mocks.course.examsEnabled = false;
  await expect(getVisitingTeacherResults('course-a', 'parciales', 'activity-a')).rejects.toMatchObject({ status: 404 });
  expect(mocks.getActivity).not.toHaveBeenCalled();
  expect(mocks.listAttempts).not.toHaveBeenCalled();
});

it('filtra las actividades y los intentos por el curso y la evaluación solicitados', async () => {
  mocks.getAttempt.mockRejectedValue({ status: 404 });
  await expect(getVisitingTeacherResults('course-a', 'parciales', 'activity-a', 1, 'foreign-attempt')).rejects.toMatchObject({ status: 404 });
  expect(mocks.getActivity.mock.calls[0][0]).toContain('id = {:activityId} && course = {:courseId}');
  expect(mocks.getAttempt.mock.calls[0][0]).toContain('course = {:courseId} && exam = {:activityId}');
  expect(mocks.getAttempt.mock.calls[0][0]).toContain('"attemptId":"foreign-attempt"');
  expect(mocks.listResults).not.toHaveBeenCalled();
  expect(mocks.listAnswers).not.toHaveBeenCalled();
});

it('pagina los intentos de preparación y conserva la nota cero y los puntajes históricos', async () => {
  mocks.listAttempts.mockResolvedValue({ page: 2, totalPages: 2, totalItems: 27, items: [attempt, { ...attempt, id: 'attempt-b' }] });
  mocks.listResults.mockResolvedValue([
    { attempt: 'attempt-a', student: attempt.student, correct: 0, total: 4, finishedAt },
    { attempt: 'attempt-b', student: attempt.student, correct: 2, total: 3, created: finishedAt },
  ]);
  const result = await getVisitingTeacherResults('course-a', 'preparacion', 'activity-a', 2);
  expect(result).toMatchObject({ page: 2, totalPages: 2, totalItems: 27, rows: [
    { grade: 0, state: 'Finalizado', studentName: 'Ana Pérez' }, { grade: 6.7, finishedAt },
  ] });
  expect(mocks.listAttempts).toHaveBeenCalledWith(2, 25, expect.objectContaining({ filter: expect.stringContaining('quiz = {:activityId}') }));
  expect(mocks.listResults).toHaveBeenCalledWith(expect.objectContaining({
    filter: expect.stringContaining('course = {:courseId} && attempt.quiz = {:activityId}'),
    fields: expect.not.stringContaining('review'),
  }));
  expect(JSON.stringify(result)).not.toContain('private@example.com');
});

it.each(['preparacion', 'parciales'] as const)('muestra solo el detalle de respuestas y la nota del intento de %s', async kind => {
  mocks.listResults.mockResolvedValue([{
    attempt: attempt.id, student: attempt.student, finishedAt, correct: 13, total: 20,
    ...(kind === 'parciales' ? { selected: { q1: 'a' }, integralGradeAdjustment: { original: 6.5, points: 0.5 } }
      : { review: [{ question, selectedOptionId: 'a' }] }),
  }]);
  const data = await getVisitingTeacherResults('course-a', kind, 'activity-a', 1, attempt.id);
  expect(data.detail).toMatchObject({
    grade: kind === 'parciales' ? 7 : 6.5, adjusted: kind === 'parciales',
    questions: [{ id: 'q1', prompt: question.prompt, answer: 'Respuesta de Ana' }],
  });
  expect(JSON.stringify(data)).not.toMatch(/correctOptionId|Explicación reservada|Opción reservada|private@example.com/);
  expect(mocks.listAnswers).not.toHaveBeenCalled();
});

it('consulta un intento vencido sin registrar una nota y solo toma respuestas previas al cierre', async () => {
  mocks.getAttempt.mockResolvedValue({ ...attempt, deadline: finishedAt, snapshot: { questions: [question] } });
  mocks.listResults.mockResolvedValue([{ attempt: attempt.id, student: 'foreign-student', correct: 4, total: 4 }]);
  mocks.listAnswers.mockResolvedValue([
    { id: 'good', created, questionId: 'q1', optionId: 'a' },
    { id: 'late', created: finishedAt, questionId: 'q1', optionId: 'b' },
  ]);
  const data = await getVisitingTeacherResults('course-a', 'parciales', 'activity-a', 1, attempt.id);
  expect(data.detail).toMatchObject({ grade: null, state: 'Pendiente de cierre', questions: [{ answer: 'Respuesta de Ana' }] });
  expect(mocks.listAnswers).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.stringContaining('&& student = {:student}') }));
});
