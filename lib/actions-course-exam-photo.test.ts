// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { beginExam } from './actions-course-exams';
const mocks = vi.hoisted(() => ({ valid: true, begin: vi.fn(), store: vi.fn(), service: vi.fn(async () => ({})) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({ authStore: { isValid: mocks.valid, record: { id: 'student' } } }) }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: mocks.service }));
vi.mock('./course-exam-service', () => ({ CourseExamError: class extends Error {}, beginCourseExam: mocks.begin }));
vi.mock('./exam-photo-storage', () => ({ storeExamPhoto: mocks.store }));
beforeEach(() => { vi.clearAllMocks(); mocks.valid = true; mocks.begin.mockImplementation(async (_pb, _service, _course, _exam, _camera, capture) => { await capture(); return 'attempt'; }); mocks.store.mockResolvedValue({ photoKey: 'private/photo.enc', rollback: vi.fn() }); });
function form(accepted = true, type = 'image/jpeg', size = 150) {
  const data = new FormData(); if (accepted) data.set('accepted', 'true'); data.set('photo', new Blob([new Uint8Array(size)], { type }), 'foto.jpg'); return data;
}
it('exige aceptación y JPEG pequeño antes de guardar en storage', async () => {
  for (const data of [form(false), form(true, 'text/plain'), form(true, 'image/jpeg', 300001), form(true, 'image/jpeg', 10), undefined]) {
    expect((await beginExam('course', 'exam', true, data)).success).toBe(false);
  }
  expect(mocks.store).not.toHaveBeenCalled();
  expect(await beginExam('course', 'exam', true, form())).toEqual({ success: true, data: 'attempt' });
  expect(mocks.store).toHaveBeenCalledWith('course', 'student', expect.any(Uint8Array));
});
it('no crea un cliente privilegiado sin sesión y permite que el servicio reanude sin nueva foto', async () => {
  mocks.valid = false; expect((await beginExam('course', 'exam', true, form())).success).toBe(false); expect(mocks.service).not.toHaveBeenCalled();
  mocks.valid = true; mocks.begin.mockResolvedValue('legacy-attempt');
  expect(await beginExam('course', 'exam', true)).toEqual({ success: true, data: 'legacy-attempt' }); expect(mocks.store).not.toHaveBeenCalled();
});
