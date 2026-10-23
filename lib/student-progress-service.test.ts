import type PocketBase from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { readStudentProgress } from './student-progress-service';
const course = { id: 'course', teachers: ['teacher'], preparationEnabled: true, examsEnabled: true };
let user: { id: string; role: string }; let valid: boolean; let enrollment: object[];
const queries: Record<string, { filter: string; fields: string }> = {};
const lists = vi.fn(async (name: string, options: { filter: string; fields: string }) => { queries[name] = options; return name === 'course_enrollments' ? enrollment : []; });
const service = { filter: (expression: string, values: object) => expression + JSON.stringify(values), collection: (name: string) => ({ getFullList: (options: { filter: string; fields: string }) => lists(name, options) }) } as unknown as PocketBase;
const client = () => ({ authStore: { isValid: valid, record: user }, collection: () => ({ getOne: async () => course }) }) as unknown as PocketBase;
beforeEach(() => { user = { id: 'teacher', role: 'estudiante' }; valid = true; enrollment = [{ student: 'student', created: '2026-10-01T12:00:00Z', expand: { student: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.invalid' } } }]; course.preparationEnabled = true; course.examsEnabled = true; lists.mockClear(); for (const key of Object.keys(queries)) delete queries[key]; });
it.each(['anonymous', 'student', 'unassigned'])('rechaza %s antes de consultar datos con privilegios', async role => {
  if (role === 'anonymous') valid = false; else user = { id: role, role: 'estudiante' };
  await expect(readStudentProgress(client(), service, 'course')).rejects.toThrow(); expect(lists).not.toHaveBeenCalled();
});
it('acota todas las lecturas al curso y el detalle al alumno matriculado', async () => {
  const data = await readStudentProgress(client(), service, 'course', 'student');
  expect(data.rows[0]).toMatchObject({ id: 'student', name: 'Ana Pérez', email: 'ana@example.invalid' });
  for (const [collection, options] of Object.entries(queries)) {
    expect(options.filter).toContain('"course":"course"');
    if (!['course_exams', 'practice_quizzes'].includes(collection)) expect(options.filter).toContain('"student":"student"');
    expect(options.fields).not.toMatch(/snapshot|review|selected|photo|questions|correctOption/);
  }
});
it('rechaza alumnos ajenos o desmatriculados antes de consultar su actividad', async () => {
  enrollment = [];
  await expect(readStudentProgress(client(), service, 'course', 'foreign')).rejects.toThrow('matrícula vigente');
  expect(lists).toHaveBeenCalledTimes(1);
});
it('respeta las secciones deshabilitadas y permite administradores', async () => {
  user = { id: 'admin', role: 'admin' }; course.preparationEnabled = false; course.examsEnabled = false;
  const data = await readStudentProgress(client(), service, 'course');
  expect(lists).toHaveBeenCalledTimes(1); expect(data.rows).toHaveLength(1); expect(data.rows[0].lastActivity).toBeNull();
});
