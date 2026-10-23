// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/parciales/[courseId]/intentos/[attemptId]/foto/route';
const mocks = vi.hoisted(() => ({ guard: vi.fn(), read: vi.fn(), load: vi.fn(), service: vi.fn(async () => ({})) }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({}) }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: mocks.service }));
vi.mock('./course-exam-service', () => ({ requireExamCourse: mocks.guard, readCourseExamPhotoKey: mocks.read }));
vi.mock('./exam-photo-storage', () => ({ loadExamPhoto: mocks.load }));
const params = Promise.resolve({ courseId: 'course', attemptId: 'attempt' });
beforeEach(() => { vi.clearAllMocks(); mocks.guard.mockResolvedValue({}); mocks.read.mockResolvedValue('private/photo.enc'); mocks.load.mockResolvedValue(Buffer.from([255, 216, 255, 217])); });
it('rechaza antes de autenticar el cliente privilegiado o tocar storage', async () => {
  mocks.guard.mockRejectedValue(new Error('No permission'));
  const response = await GET(new Request('https://example.test/foto'), { params });
  expect(response.status).toBe(404); expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.load).not.toHaveBeenCalled();
});
it('comprueba intento y curso antes de leer storage', async () => {
  mocks.read.mockRejectedValue(new Error('Foreign attempt'));
  expect((await GET(new Request('https://example.test/foto'), { params })).status).toBe(404); expect(mocks.load).not.toHaveBeenCalled();
});
it('sirve sólo el JPEG descifrado, sin caché compartida', async () => {
  const response = await GET(new Request('https://example.test/foto'), { params });
  expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('image/jpeg'); expect(response.headers.get('cache-control')).toContain('private, no-store');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([255, 216, 255, 217]));
});
