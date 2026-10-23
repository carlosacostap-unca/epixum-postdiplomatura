// @vitest-environment node
import type PocketBase from 'pocketbase';
import { randomInt } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
import { beginCourseExam, readCourseExamAttempt } from './course-exam-service';
import { examScore, visibleExamResult, type CourseExam, type ExamAttempt } from './course-exams';

vi.mock('node:crypto', async importOriginal => ({ ...await importOriginal<typeof import('node:crypto')>(), randomInt: vi.fn() }));
const random = vi.mocked(randomInt as (limit: number) => number);
const attempts = new Map<string, ExamAttempt>();
let exam: CourseExam;
const capture = vi.fn(async () => ({ photoKey: 'private/photo.enc', rollback: vi.fn() }));
function clients(student: string) {
  const pb = { authStore: { isValid: true, record: { id: student, role: 'estudiante' } }, filter: (filter: string) => filter, collection: () => ({ getOne: async () => ({ id: 'course', examsEnabled: true }), getList: async () => ({ items: [{ id: 'enrollment' }] }) }) } as unknown as PocketBase;
  const service = { filter: (filter: string) => filter, collection: (name: string) => ({
    getOne: async (id: string) => name === 'course_exams' ? exam : attempts.get(id),
    getList: async () => ({ items: name === 'course_exam_attempts' ? [...attempts.values()].filter(a => a.student === student) : [] }),
    getFullList: async () => [],
    create: async (data: ExamAttempt) => { const attempt = { ...data, id: `attempt-${student}`, created: new Date().toISOString() }; attempts.set(attempt.id, attempt); return attempt; },
  }) } as unknown as PocketBase;
  return { pb, service };
}
beforeEach(() => {
  vi.clearAllMocks(); attempts.clear(); random.mockReturnValue(0);
  exam = { id: 'exam', course: 'course', title: 'Parcial', description: '', status: 'published', opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 3600000).toISOString(), questions: Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, prompt: `Pregunta ${i}`, options: ['a', 'b', 'c', 'd'].map(id => ({ id, label: `Opción ${id}` })), correctOptionId: 'b', explanation: `Explicación ${i}` })) };
});
it('genera presentaciones por alumno sin alterar el parcial ni perder preguntas, opciones o claves', async () => {
  const original = structuredClone(exam);
  const first = clients('ana'); const second = clients('bruno');
  const firstId = await beginCourseExam(first.pb, first.service, 'course', 'exam', true, capture);
  random.mockImplementation(limit => Number(limit) - 1);
  const secondId = await beginCourseExam(second.pb, second.service, 'course', 'exam', true, capture);
  const firstQuestions = attempts.get(firstId)!.snapshot.questions; const secondQuestions = attempts.get(secondId)!.snapshot.questions;
  expect(firstQuestions.map(q => q.id)).not.toEqual(secondQuestions.map(q => q.id));
  expect(firstQuestions[0].options.map(o => o.id)).not.toEqual(secondQuestions[0].options.map(o => o.id));
  for (const questions of [firstQuestions, secondQuestions]) {
    expect(questions.map(q => q.id).sort()).toEqual(exam.questions.map(q => q.id).sort());
    for (const q of questions) { expect(q.options.map(o => o.id).sort()).toEqual(['a', 'b', 'c', 'd']); expect(q.correctOptionId).toBe('b'); }
  }
  expect(exam).toEqual(original);
});
it('conserva exactamente el orden al leer y retomar desde otra sesión sin una nueva captura', async () => {
  const { pb, service } = clients('ana');
  const id = await beginCourseExam(pb, service, 'course', 'exam', true, capture);
  const view = await readCourseExamAttempt(pb, service, 'course', id);
  random.mockImplementation(() => { throw new Error('No se debe volver a mezclar'); });
  const anotherSession = clients('ana');
  expect(await beginCourseExam(anotherSession.pb, anotherSession.service, 'course', 'exam', true, capture)).toBe(id);
  expect((await readCourseExamAttempt(anotherSession.pb, anotherSession.service, 'course', id)).questions).toEqual(view.questions);
  expect(capture).toHaveBeenCalledOnce(); expect(JSON.stringify(view)).not.toMatch(/correctOptionId|explanation/);
});
it('califica y devuelve las correcciones por identificador siguiendo el orden guardado', async () => {
  const { pb, service } = clients('ana'); const id = await beginCourseExam(pb, service, 'course', 'exam', true, capture); const attempt = attempts.get(id)!;
  const selected = Object.fromEntries(exam.questions.slice(0, 7).map(q => [q.id, 'b']));
  const score = examScore(attempt.snapshot.questions, selected); expect(score).toEqual({ correct: 7, total: 20, percentage: 35 });
  const result = visibleExamResult({ id: 'result', attempt: id, finishedAt: attempt.deadline, reason: 'submitted', selected, ...score }, attempt, 'manage');
  expect(result.feedbackAvailable).toBe(true);
  if (result.feedbackAvailable) {
    expect(result.review.map(r => r.question.id)).toEqual(attempt.snapshot.questions.map(q => q.id));
    expect(result.review.filter(r => r.correct)).toHaveLength(7);
    expect(result.review.filter(r => r.selectedOptionId === null)).toHaveLength(13);
  }
});
it('mantiene intactos los intentos anteriores que se iniciaron sin aleatorización', async () => {
  const original = structuredClone(exam);
  attempts.set('legacy', { id: 'legacy', course: 'course', exam: 'exam', student: 'ana', title: exam.title, snapshot: original, deadline: exam.closesAt, created: new Date().toISOString(), cameraActive: true, cameraLastSeen: new Date().toISOString() });
  random.mockImplementation(() => { throw new Error('No se debe mezclar un intento anterior'); });
  const { pb, service } = clients('ana');
  expect(await beginCourseExam(pb, service, 'course', 'exam', true, capture)).toBe('legacy');
  expect((await readCourseExamAttempt(pb, service, 'course', 'legacy')).questions.map(q => q.id)).toEqual(original.questions.map(q => q.id)); expect(capture).not.toHaveBeenCalled();
  expect(attempts.get('legacy')!.snapshot).toEqual(original);
});
