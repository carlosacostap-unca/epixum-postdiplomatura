import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDeliverySubmission } from '@/types';

const mocks = vi.hoisted(() => ({
  enabled: true,
  active: true,
  resolve: vi.fn(),
}));

vi.mock('./pocketbase-service', () => ({
  createServiceClient: vi.fn(async () => ({
    filter: (value: string) => value,
    collection: () => ({
      getOne: vi.fn(async () => ({ id: 'course-1', aiPreevaluationEnabled: mocks.enabled })),
      getFirstListItem: vi.fn(async () => ({ id: 'config-1', active: mocks.active })),
    }),
  })),
}));
vi.mock('./github-repository', () => ({ resolvePublicGithubRepository: mocks.resolve }));

import { serializeDeliveryUrlForAssignment } from './delivery-github';

describe('captura GitHub de una entrega', () => {
  beforeEach(() => {
    mocks.enabled = true;
    mocks.active = true;
    mocks.resolve.mockReset().mockResolvedValue({ canonicalUrl: 'https://github.com/Epixum/TP', fullName: 'Epixum/TP', commitSha: 'a'.repeat(40) });
  });

  it('mantiene URLs genéricas sin consultar GitHub cuando el curso o TP no está activo', async () => {
    mocks.enabled = false;
    const serialized = await serializeDeliveryUrlForAssignment('assignment-1', 'course-1', 'https://example.com/entrega', 'student-submission');
    expect(parseDeliverySubmission(serialized)).toEqual({ type: 'url', url: 'https://example.com/entrega' });
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it('exige raíz pública de GitHub cuando la configuración está activa', async () => {
    await expect(serializeDeliveryUrlForAssignment('assignment-1', 'course-1', 'https://github.com/Epixum/TP/issues', 'student-submission')).rejects.toThrow(/requiere la URL HTTPS/);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it('persiste URL canónica, SHA, fecha y origen al entregar o actualizar', async () => {
    const serialized = await serializeDeliveryUrlForAssignment('assignment-1', 'course-1', 'https://github.com/Epixum/TP.git', 'student-update');
    const submission = parseDeliverySubmission(serialized);
    expect(submission).toMatchObject({ type: 'url', provider: 'github', url: 'https://github.com/Epixum/TP', repositoryFullName: 'Epixum/TP', commitSha: 'a'.repeat(40), captureSource: 'student-update' });
    expect(submission.type === 'url' && submission.commitCapturedAt).toEqual(expect.any(String));
  });
});
