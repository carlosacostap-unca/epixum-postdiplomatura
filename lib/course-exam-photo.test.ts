// @vitest-environment node
import PocketBase from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { beginCourseExam, readCourseExamAttempt, readCourseExamPhotoKey } from './course-exam-service';
import type { CourseExam, ExamAttempt } from './course-exams';

let exam: CourseExam; let saved: ExamAttempt | null; let legacy: ExamAttempt;
let enrolled: boolean;
const create = vi.fn(); const rollback = vi.fn(async () => {});
const capture = vi.fn(async () => ({ photoKey: 'private/new-photo.enc', rollback }));
function clients(id = 'student', role = 'estudiante') {
  const pb = { authStore: { isValid: true, record: { id, role } }, filter: new PocketBase().filter, collection: () => ({ getOne: async () => ({ id: 'course', examsEnabled: true, teachers: ['teacher'] }), getList: async () => ({ items: enrolled ? [{ id: 'enrollment' }] : [] }) }) } as unknown as PocketBase;
  const service = { filter: new PocketBase().filter, collection: (name: string) => ({
    getOne: async () => name === 'course_exams' ? exam : name === 'users' ? { name: 'Alumno' } : saved || legacy,
    getList: async () => ({ items: name === 'course_exam_attempts' && saved ? [saved] : [] }), getFullList: async () => [], create,
  }) } as unknown as PocketBase;
  return { pb, service };
}
beforeEach(() => {
  vi.clearAllMocks(); saved = null; enrolled = true;
  exam = { id: 'exam', course: 'course', title: 'Parcial', description: '', status: 'published', opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 3600000).toISOString(), questions: [{ id: 'q', prompt: 'Pregunta', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: '' }] };
  legacy = { id: 'attempt', exam: 'exam', course: 'course', student: 'student', title: 'Parcial', snapshot: exam, created: new Date().toISOString(), deadline: exam.closesAt, cameraActive: true, cameraLastSeen: new Date().toISOString() };
  capture.mockImplementation(async () => ({ photoKey: 'private/new-photo.enc', rollback }));
  create.mockImplementation(async data => { saved = { ...legacy, ...data }; return saved; });
});
it('exige foto al iniciar y conserva una sola al reanudar, incluso sin callback', async () => {
  const { pb, service } = clients();
  await expect(beginCourseExam(pb, service, 'course', 'exam', true)).rejects.toThrow('foto inicial');
  await beginCourseExam(pb, service, 'course', 'exam', true, capture);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ photoKey: 'private/new-photo.enc' }));
  await beginCourseExam(pb, service, 'course', 'exam', true, capture);
  await beginCourseExam(pb, service, 'course', 'exam', true);
  expect(capture).toHaveBeenCalledOnce(); expect(create).toHaveBeenCalledOnce();
});
it('permite retomar intentos anteriores sin foto y no captura fuera de horario o sin matrícula', async () => {
  const { pb, service } = clients(); saved = legacy;
  expect(await beginCourseExam(pb, service, 'course', 'exam', true, capture)).toBe('attempt'); expect(capture).not.toHaveBeenCalled();
  saved = null; enrolled = false;
  await expect(beginCourseExam(pb, service, 'course', 'exam', true, capture)).rejects.toThrow('matriculado');
  enrolled = true; exam.closesAt = new Date(Date.now() - 1).toISOString();
  await expect(beginCourseExam(pb, service, 'course', 'exam', true, capture)).rejects.toThrow('horario'); expect(capture).not.toHaveBeenCalled();
});
it('retira la foto si falla el intento o si se alcanza el cierre durante la subida', async () => {
  const { pb, service } = clients(); create.mockRejectedValue(new Error('Database failure'));
  await expect(beginCourseExam(pb, service, 'course', 'exam', true, capture)).rejects.toThrow('Database failure'); expect(rollback).toHaveBeenCalledOnce();
  rollback.mockClear(); capture.mockImplementation(async () => { exam = { ...exam, closesAt: new Date(Date.now() - 1).toISOString() }; return { photoKey: 'private/new-photo.enc', rollback }; });
  await expect(beginCourseExam(pb, service, 'course', 'exam', true, capture)).rejects.toThrow('cierre'); expect(rollback).toHaveBeenCalledOnce();
});
it('conserva la foto tras una respuesta fallida posterior al commit y retira la perdedora en concurrencia', async () => {
  const { pb, service } = clients();
  create.mockImplementationOnce(async data => { saved = { ...legacy, ...data }; throw new Error('Lost response'); });
  expect(await beginCourseExam(pb, service, 'course', 'exam', true, capture)).toBe('attempt'); expect(rollback).not.toHaveBeenCalled();
  saved = null; create.mockImplementationOnce(async () => { saved = { ...legacy, photoKey: 'private/winner.enc' }; throw new Error('Duplicate'); });
  expect(await beginCourseExam(pb, service, 'course', 'exam', true, capture)).toBe('attempt'); expect(rollback).toHaveBeenCalledOnce();
});
it('reserva la foto a docentes asignados y administradores, sin exponer la clave en las vistas', async () => {
  saved = { ...legacy, photoKey: 'private/new-photo.enc' };
  for (const [id, role] of [['teacher', 'estudiante'], ['admin', 'admin']]) {
    const { pb, service } = clients(id, role);
    expect(await readCourseExamPhotoKey(pb, service, 'course', 'attempt')).toBe(saved.photoKey);
    const view = await readCourseExamAttempt(pb, service, 'course', 'attempt', 'manage');
    expect(view.initialPhotoUrl).toBe('/api/parciales/course/intentos/attempt/foto'); expect(JSON.stringify(view)).not.toContain('private/');
    await expect(readCourseExamPhotoKey(pb, service, 'foreign', 'attempt')).rejects.toThrow('acceso');
  }
  for (const id of ['student', 'outsider']) { const { pb, service } = clients(id); await expect(readCourseExamPhotoKey(pb, service, 'course', 'attempt')).rejects.toThrow('permiso'); }
  const { pb, service } = clients(); expect((await readCourseExamAttempt(pb, service, 'course', 'attempt')).initialPhotoUrl).toBeUndefined();
});
