// @vitest-environment node
import type PocketBase from 'pocketbase';
import { randomInt } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
afterEach(() => { vi.restoreAllMocks(); });
it('elige la versión vigente, guarda sólo sus preguntas y conserva un intento total entre turnos', async () => {
  const now = Date.now();
  exam.opensAt = new Date(now - 1000).toISOString(); exam.closesAt = new Date(now + 1000).toISOString();
  exam.sessions = [{ id: 'night', label: 'Turno noche', opensAt: new Date(now + 2000).toISOString(), closesAt: new Date(now + 3600000).toISOString(), questions: exam.questions.map(q => ({ ...q, id: `night-${q.id}`, prompt: `Noche ${q.prompt}` })) }];
  const ana = clients('ana');
  const firstId = await beginCourseExam(ana.pb, ana.service, 'course', 'exam', true, capture);
  expect(attempts.get(firstId)!.snapshot.sessions).toBeUndefined();
  expect(attempts.get(firstId)!.deadline).toBe(exam.closesAt);
  vi.spyOn(Date, 'now').mockReturnValue(now + 1500);
  const bruno = clients('bruno');
  await expect(beginCourseExam(bruno.pb, bruno.service, 'course', 'exam', true, capture)).rejects.toThrow('horario');
  vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
  expect(await beginCourseExam(ana.pb, ana.service, 'course', 'exam', true, capture)).toBe(firstId);
  const secondId = await beginCourseExam(bruno.pb, bruno.service, 'course', 'exam', true, capture);
  const second = attempts.get(secondId)!;
  expect(second.snapshot.questions.every(q => q.id.startsWith('night-'))).toBe(true);
  expect(second.snapshot.sessions).toBeUndefined();
  expect(second.deadline).toBe(exam.sessions[0].closesAt);
  expect(second.title).toContain('Turno noche');
  expect(capture).toHaveBeenCalledTimes(2);
  expect(attempts.size).toBe(2);
});
it('cancela el inicio y retira la foto si el turno cambia durante la captura', async () => {
  const now = Date.now();
  exam.closesAt = new Date(now + 1000).toISOString();
  exam.sessions = [{ id: 'night', label: 'Noche', opensAt: new Date(now + 1000).toISOString(), closesAt: new Date(now + 3600000).toISOString(), questions: exam.questions.map(q => ({ ...q, id: `night-${q.id}`, prompt: `Noche ${q.prompt}` })) }];
  const rollback = vi.fn();
  const photo = async () => { vi.spyOn(Date, 'now').mockReturnValue(now + 1000); return { photoKey: 'temp', rollback }; };
  const { pb, service } = clients('ana');
  await expect(beginCourseExam(pb, service, 'course', 'exam', true, photo)).rejects.toThrow('cambiaron');
  expect(rollback).toHaveBeenCalledOnce(); expect(attempts.size).toBe(0);
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
