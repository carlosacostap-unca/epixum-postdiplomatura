import { beforeEach, expect, it, vi } from 'vitest';
import { getCourseExams, getCourseExamRoster } from './course-exam-data';
const mocks = vi.hoisted(() => ({ lists: {} as Record<string, unknown[]>, queries: {} as Record<string, { filter: string; fields: string; expand?: string }>, pb: { authStore: { record: { id: 'student' } } }, service: { filter: vi.fn((expression: string, values: object) => expression + JSON.stringify(values)), collection: vi.fn() } }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => mocks.pb }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: async () => mocks.service }));
vi.mock('./course-exam-service', () => ({ CourseExamError: class extends Error {}, requireExamCourse: async () => ({ id: 'course', examsEnabled: true }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.queries = {};
  mocks.service.collection.mockImplementation((name: string) => ({ getFullList: async (options: { filter: string; fields: string; expand?: string }) => { mocks.queries[name] = options; return mocks.lists[name] || []; } }));
  const future = new Date(Date.now() + 60000).toISOString(); const past = new Date(Date.now() - 60000).toISOString();
  mocks.lists = {
    course_exams: [],
    course_exam_attempts: [{ id: 'early', deadline: future }, { id: 'closed', deadline: past }],
    course_exam_results: ['early', 'closed'].map(attempt => ({ id: `result-${attempt}`, attempt, finishedAt: past, reason: 'submitted', correct: 1, total: 2, percentage: 50 })),
  };
});
it('acota el listado docente al parcial elegido y pide identidad de los alumnos', async () => {
  mocks.lists.course_exams = [{ id: 'exam', title: 'Primer parcial' }, { id: 'other', title: 'Otro parcial' }];
  const data = await getCourseExamRoster('course', 'exam');
  expect(data.exams).toEqual([{ id: 'exam', title: 'Primer parcial' }]);
  expect(mocks.service.filter).toHaveBeenCalledWith(' && exam = {:exam}', { exam: 'exam' });
  expect(mocks.queries.course_exam_attempts).toMatchObject({ expand: 'student', fields: expect.stringContaining('expand.student.email'), filter: expect.stringContaining('"exam":"exam"') });
  expect(mocks.queries.course_exam_results.filter).toContain('"exam":"exam"');
});
it('rechaza un parcial ajeno al curso antes de consultar intentos y resultados', async () => {
  await expect(getCourseExamRoster('course', 'foreign-exam')).rejects.toThrow('no pertenece');
  expect(mocks.service.collection).not.toHaveBeenCalledWith('course_exam_attempts');
  expect(mocks.service.collection).not.toHaveBeenCalledWith('course_exam_results');
});
it('no serializa notas de entregas anticipadas en la lista del alumno', async () => {
  const { results } = await getCourseExams('course', 'student');
  expect(results[0]).toEqual(expect.objectContaining({ attempt: 'early', feedbackAvailable: false }));
  expect(JSON.stringify(results[0])).not.toMatch(/correct|percentage|total/);
  expect(results[1]).toMatchObject({ attempt: 'closed', feedbackAvailable: true, correct: 1, total: 2 });
});
it('mantiene el seguimiento de notas del equipo docente antes del cierre', async () => {
  const { results } = await getCourseExams('course', 'manage');
  expect(results.every(r => r.feedbackAvailable)).toBe(true);
});
