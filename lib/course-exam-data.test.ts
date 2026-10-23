import { beforeEach, expect, it, vi } from 'vitest';
import { getCourseExams } from './course-exam-data';
const mocks = vi.hoisted(() => ({ lists: {} as Record<string, unknown[]>, pb: { authStore: { record: { id: 'student' } } }, service: { filter: vi.fn(() => 'course-filter'), collection: vi.fn() } }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => mocks.pb }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: async () => mocks.service }));
vi.mock('./course-exam-service', () => ({ requireExamCourse: async () => ({ id: 'course', examsEnabled: true }) }));
beforeEach(() => {
  mocks.service.collection.mockImplementation((name: string) => ({ getFullList: async () => mocks.lists[name] || [] }));
  const future = new Date(Date.now() + 60000).toISOString(); const past = new Date(Date.now() - 60000).toISOString();
  mocks.lists = {
    course_exams: [],
    course_exam_attempts: [{ id: 'early', deadline: future }, { id: 'closed', deadline: past }],
    course_exam_results: ['early', 'closed'].map(attempt => ({ id: `result-${attempt}`, attempt, finishedAt: past, reason: 'submitted', correct: 1, total: 2, percentage: 50 })),
  };
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
