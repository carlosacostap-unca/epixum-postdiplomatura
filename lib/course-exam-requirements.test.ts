// @vitest-environment node
import type PocketBase from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { readExamRequirements } from './course-exam-requirement-service';
import { examRequirements } from './course-exam-requirements';
import { beginCourseExam } from './course-exam-service';
import { finalizePractice } from './preparation-service';
vi.mock('./preparation-service', () => ({ finalizePractice: vi.fn(async () => ({ id: 'finished' })) }));
const course = 'tceqb7atji66fmd', examId = 'fiasecondexam01';
let completed: Set<string>;
let pending: Record<string, unknown[]>;
const create = vi.fn(async () => ({ id: 'new-attempt' }));
const capture = vi.fn(async () => ({ photoKey: 'photo', rollback: vi.fn() }));
let opensAt: string, closesAt: string;
const queries: Array<{ expression: string; values: Record<string, string> }> = [];
const service = {
  filter: (expression: string, values: Record<string, string>) => { queries.push({ expression, values }); return JSON.stringify(values); },
  collection: (name: string) => ({
    getOne: async () => ({ id: examId, course, status: 'published', title: 'Segundo parcial', description: '', opensAt, closesAt, questions: [{ id: 'q', prompt: 'Pregunta', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'a' }] }),
    getList: async (_p: number, _n: number, options: { filter: string }) => { const scope = JSON.parse(options.filter); return { items: name === 'practice_results' && scope.student === 'student' && completed.has(scope.quiz) ? [{ id: 'result', correct: 0 }] : [] }; },
    getFullList: async (options: { filter: string }) => pending[JSON.parse(options.filter).quiz] || [],
    create,
  }),
} as unknown as PocketBase;
const pb = { authStore: { isValid: true, record: { id: 'student' } }, filter: () => '', collection: () => ({ getOne: async () => ({ examsEnabled: true }), getList: async () => ({ items: [{ id: 'enrolled' }] }) }) } as unknown as PocketBase;
beforeEach(() => { vi.clearAllMocks(); completed = new Set(); pending = {}; queries.length = 0; opensAt = new Date(Date.now() - 1000).toISOString(); closesAt = new Date(Date.now() + 3600000).toISOString(); });
it('distingue ninguno, parcial y todos, incluyendo resultados con cero aciertos', async () => {
  expect((await readExamRequirements(service, course, examId, 'student')).filter(r => r.completed)).toHaveLength(0);
  completed.add('fiaunit4prep001');
  expect((await readExamRequirements(service, course, examId, 'student')).map(r => r.completed)).toEqual([true, false, false]);
  examRequirements(course, examId).forEach(r => completed.add(r.quizId));
  expect((await readExamRequirements(service, course, examId, 'student')).every(r => r.completed)).toBe(true);
  expect((await readExamRequirements(service, course, examId, 'another-student')).some(r => r.completed)).toBe(false);
  expect(queries.filter(q => q.expression.startsWith('course')).every(q => q.values.course === course)).toBe(true);
});
it('no aplica requisitos a otros cursos o parciales', async () => {
  expect(await readExamRequirements(service, 'other', examId, 'student')).toEqual([]);
  expect(await readExamRequirements(service, course, 'fiafirstexam001', 'student')).toEqual([]);
  expect(queries).toHaveLength(0);
});
it('no cuenta intentos abiertos; finaliza y cuenta una simulación vencida', async () => {
  pending.fiaunit4prep001 = [{ created: new Date().toISOString(), snapshot: { durationMinutes: 0 } }];
  pending.nqcx3so0zz4o86y = [{ id: 'timed', created: new Date(Date.now() - 61 * 60000).toISOString(), snapshot: { durationMinutes: 60 } }];
  const progress = await readExamRequirements(service, course, examId, 'student');
  expect(progress.map(r => r.completed)).toEqual([false, false, true]);
  expect(finalizePractice).toHaveBeenCalledWith(service, pending.nqcx3so0zz4o86y[0]);
});
it('rechaza el inicio directo antes de capturar foto o crear intento si falta un requisito', async () => {
  completed.add('fiaunit4prep001'); completed.add('fiaunit5prep001');
  await expect(beginCourseExam(pb, service, course, examId, true, capture)).rejects.toThrow('Simulación del segundo parcial');
  expect(capture).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
});
it('admite el inicio con los tres finalizados y conserva el cierre común', async () => {
  examRequirements(course, examId).forEach(r => completed.add(r.quizId));
  expect(await beginCourseExam(pb, service, course, examId, true, capture)).toBe('new-attempt');
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ deadline: closesAt, student: 'student' }));
});
it('cumplir todos los requisitos no permite iniciar antes del horario', async () => {
  examRequirements(course, examId).forEach(r => completed.add(r.quizId));
  opensAt = new Date(Date.now() + 10000).toISOString();
  await expect(beginCourseExam(pb, service, course, examId, true, capture)).rejects.toThrow('horario');
  expect(create).not.toHaveBeenCalled();
});
