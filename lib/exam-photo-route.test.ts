// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/preparacion/[courseId]/intentos/[attemptId]/foto/route';

const mocks = vi.hoisted(() => ({ read: vi.fn(), load: vi.fn() }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({}) }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: async () => ({}) }));
vi.mock('./preparation-service', () => ({ readPracticePhotoKey: mocks.read }));
vi.mock('./exam-photo-storage', () => ({ loadExamPhoto: mocks.load }));
const params = Promise.resolve({ courseId: 'course', attemptId: 'attempt' });
beforeEach(() => vi.clearAllMocks());

it('comprueba acceso antes de leer storage y niega fotos a un alumno', async () => {
  mocks.read.mockRejectedValue(new Error('No permission'));
  const response = await GET(new Request('https://example.test/foto'), { params });
  expect(response.status).toBe(404); expect(mocks.load).not.toHaveBeenCalled();
});

it('entrega el JPEG autorizado sin permitir cachear la foto', async () => {
  mocks.read.mockResolvedValue('private/photo.enc'); mocks.load.mockResolvedValue(Buffer.from([255,216,255,217]));
  const response = await GET(new Request('https://example.test/foto'), { params });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/jpeg');
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([255,216,255,217]));
});
