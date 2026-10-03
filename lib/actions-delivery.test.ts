import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'teacher-1', role: 'docente' } as { id: string; role: string } | null,
  sessionDelivery: { id: 'delivery0000001', assignment: 'assignment-1' },
  currentDelivery: {
    id: 'delivery0000001', collectionId: 'deliveries', collectionName: 'deliveries',
    created: '2026-09-01T10:00:00.000Z', updated: '2026-09-02T10:00:00.000Z',
    assignment: 'assignment-1', student: 'student-1', status: 'pending',
    submissionVersion: 2, evaluatedVersion: 1, resubmissionCount: 1,
    repositoryUrl: JSON.stringify({ type: 'url', url: 'https://github.com/example/tp', provider: 'github', repositoryFullName: 'example/tp', commitSha: 'b'.repeat(40), commitCapturedAt: '2026-09-02T10:00:00.000Z', captureSource: 'student-update' }),
  },
  attempt: { id: 'attempt-1', delivery: 'delivery0000001', status: 'completed', commitSha: 'b'.repeat(40) },
  deliveryUpdate: vi.fn(),
  attemptUpdate: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { get model() { return mocks.user; } },
    collection: (name: string) => ({
      getOne: vi.fn(async (id: string) => {
        if (name === 'deliveries') return { ...mocks.sessionDelivery, id };
        if (name === 'assignments') return { id, course: 'course-1' };
        if (name === 'courses') return { id, teachers: ['teacher-1'] };
        throw new Error('not found');
      }),
    }),
  })),
}));
vi.mock('./pocketbase-service', () => ({ createServiceClient: mocks.serviceClient }));
vi.mock('./s3', () => ({ getPresignedUploadUrl: vi.fn(), getPresignedDownloadUrl: vi.fn(), configureBucketCors: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { updateDeliveryEvaluation } from './actions';
import { buildAIPreevaluationFeedback } from './ai-preevaluation-report';
import { reportFixture } from '@/test/ai-preevaluation-report-fixture';

describe('evaluación versionada de entregas', () => {
  beforeEach(() => {
    mocks.user = { id: 'teacher-1', role: 'docente' };
    mocks.currentDelivery.submissionVersion = 2;
    mocks.currentDelivery.status = 'pending';
    mocks.attempt.commitSha = 'b'.repeat(40);
    mocks.deliveryUpdate.mockReset().mockResolvedValue({});
    mocks.attemptUpdate.mockReset().mockResolvedValue({});
    mocks.serviceClient.mockReset().mockImplementation(async () => ({
      collection: (name: string) => ({
        getOne: vi.fn(async () => name === 'deliveries' ? structuredClone(mocks.currentDelivery) : structuredClone(mocks.attempt)),
        update: name === 'deliveries' ? mocks.deliveryUpdate : mocks.attemptUpdate,
      }),
    }));
  });

  it('rechaza una publicación si el alumno cambió la versión', async () => {
    const result = await updateDeliveryEvaluation('delivery0000001', 8, 'Bien.', 'Aprobado', 'published', 1);
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('cambió') });
    expect(mocks.deliveryUpdate).not.toHaveBeenCalled();
  });

  it('rechaza una sugerencia de IA perteneciente a otro commit', async () => {
    mocks.attempt.commitSha = 'a'.repeat(40);
    const result = await updateDeliveryEvaluation('delivery0000001', 8, 'Bien.', 'Aprobado', 'published', 2, 'attempt-1');
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('versión anterior') });
    expect(mocks.deliveryUpdate).not.toHaveBeenCalled();
  });

  it('publica contra la versión vigente y registra la versión evaluada', async () => {
    const result = await updateDeliveryEvaluation('delivery0000001', 8, 'Bien.', 'Aprobado', 'published', 2, 'attempt-1');
    expect(result).toEqual({ success: true });
    expect(mocks.deliveryUpdate).toHaveBeenCalledWith('delivery0000001', expect.objectContaining({ status: 'published', evaluatedVersion: 2, verdict: 'Aprobado' }));
    expect(mocks.attemptUpdate).toHaveBeenCalledWith('attempt-1', expect.objectContaining({ adoptedAs: 'published', adoptedBy: 'teacher-1' }));
  });

  it('bloquea a un docente ajeno antes de usar el cliente de servicio', async () => {
    mocks.user = { id: 'teacher-2', role: 'docente' };
    const result = await updateDeliveryEvaluation('delivery0000001', 8, 'Bien.', 'Aprobado', 'published', 2);
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('No autorizado') });
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it('persiste íntegramente el informe revisado sin reducirlo al mensaje de la IA', async () => {
    const feedback = `${buildAIPreevaluationFeedback(reportFixture)}\n\nAclaración docente: verificá la validación.`;
    const result = await updateDeliveryEvaluation('delivery0000001', 5, feedback, 'Corregir y reenviar', 'published', 2, 'attempt-1');
    expect(result).toEqual({ success: true });
    expect(mocks.deliveryUpdate).toHaveBeenCalledWith('delivery0000001', expect.objectContaining({ feedback, grade: 5, verdict: 'Corregir y reenviar', status: 'published', evaluatedVersion: 2 }));
  });
});
