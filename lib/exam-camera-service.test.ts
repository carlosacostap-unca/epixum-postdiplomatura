// @vitest-environment node
import PocketBase from 'pocketbase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertPracticeCamera, readPracticePhotoKey, reportPracticeCamera, startPractice } from './preparation-service';
import { practiceQuizSchema, type PracticeAttempt } from './preparation';

const snapshot = practiceQuizSchema.parse({ title: 'Parcial', status: 'published', durationMinutes: 60, questions: [{ id: 'q', prompt: 'Pregunta', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'a' }] });
let attempt: PracticeAttempt;
let pending: boolean;
let enrolled: boolean;
const create = vi.fn(); const update = vi.fn();
function clients(role = 'estudiante') {
  const pb = { authStore: { isValid: true, record: { id: 'student', role } }, filter: new PocketBase().filter, collection: () => ({ getOne: async () => ({ id: 'course', preparationEnabled: true, teachers: ['teacher'] }), getList: async () => ({ totalItems: enrolled ? 1 : 0 }) }) } as unknown as PocketBase;
  const service = { filter: new PocketBase().filter, collection: (name: string) => ({ getList: async () => ({ items: name === 'practice_attempts' && pending ? [{ id: 'attempt' }] : [] }), getOne: async () => name === 'practice_quizzes' ? { ...snapshot, id: 'quiz', course: 'course' } : attempt, create, update }) } as unknown as PocketBase;
  return { pb, service };
}
beforeEach(() => {
  vi.clearAllMocks(); pending = false; enrolled = true;
  attempt = { id: 'attempt', course: 'course', student: 'student', quiz: 'quiz', title: 'Parcial', snapshot, created: new Date().toISOString(), cameraRequired: true, cameraActive: true, cameraLastSeen: new Date().toISOString(), photoKey: 'private/photo.enc' };
  create.mockResolvedValue({ id: 'attempt' }); update.mockResolvedValue({});
});
describe('cámara y foto por intento', () => {
  it('requiere foto para un examen nuevo y no la duplica al reanudar', async () => {
    const { pb, service } = clients(); const capture = vi.fn(async () => ({ photoKey: 'private/photo.enc', rollback: vi.fn() }));
    await expect(startPractice(pb, service, 'course', 'quiz')).rejects.toThrow('foto inicial');
    expect(create).not.toHaveBeenCalled();
    await startPractice(pb, service, 'course', 'quiz', false, capture);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ cameraRequired: true, photoKey: 'private/photo.enc' }));
    pending = true;
    expect(await startPractice(pb, service, 'course', 'quiz', true, capture)).toBe('attempt');
    expect(capture).toHaveBeenCalledTimes(1);
  });
  it('bloquea una cámara inactiva, caducada o sin foto', () => {
    expect(() => assertPracticeCamera(attempt)).not.toThrow();
    expect(() => assertPracticeCamera({ ...attempt, cameraActive: false })).toThrow();
    expect(() => assertPracticeCamera({ ...attempt, cameraLastSeen: new Date(Date.now() - 26_000).toISOString() })).toThrow();
    expect(() => assertPracticeCamera({ ...attempt, photoKey: '' })).toThrow();
  });
  it('registra actividad sólo para el propietario y rechaza una matrícula revocada', async () => {
    const { pb, service } = clients();
    await reportPracticeCamera(pb, service, 'course', 'attempt', false);
    expect(update).toHaveBeenCalledWith('attempt', { cameraActive: false, cameraLastSeen: '' });
    attempt.student = 'other';
    await expect(reportPracticeCamera(pb, service, 'course', 'attempt', true)).rejects.toThrow('acceso');
    attempt.student = 'student'; enrolled = false;
    await expect(reportPracticeCamera(pb, service, 'course', 'attempt', true)).rejects.toThrow('matrícula');
  });
  it('reserva la lectura de fotos a administración y docentes asignados', async () => {
    const student = clients();
    await expect(readPracticePhotoKey(student.pb, student.service, 'course', 'attempt')).rejects.toThrow('permisos');
    const admin = clients('admin');
    expect(await readPracticePhotoKey(admin.pb, admin.service, 'course', 'attempt')).toBe(attempt.photoKey);
    await expect(readPracticePhotoKey(admin.pb, admin.service, 'another', 'attempt')).rejects.toThrow('acceso');
  });
  it('retira la foto si falla el registro del intento', async () => {
    const { pb, service } = clients(); const rollback = vi.fn(async () => {});
    create.mockRejectedValue(new Error('Database failure'));
    await expect(startPractice(pb, service, 'course', 'quiz', false, async () => ({ photoKey: 'private/photo.enc', rollback }))).rejects.toThrow();
    expect(rollback).toHaveBeenCalledOnce();
  });
});
