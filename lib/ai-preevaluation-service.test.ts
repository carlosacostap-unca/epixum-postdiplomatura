import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'teacher-1', role: 'docente' } as { id: string; role: string } | null,
  course: { id: 'course-a', teachers: ['teacher-1'], aiPreevaluationEnabled: true },
  config: null as Record<string, unknown> | null,
  serviceClient: vi.fn(),
  resolve: vi.fn(),
  download: vi.fn(),
  prepare: vi.fn(),
  openaiParse: vi.fn(),
  attemptCreate: vi.fn(),
  attemptUpdate: vi.fn(),
  processing: null as Record<string, unknown> | null,
  repositoryUrl: JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp' }),
}));

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { get model() { return mocks.user; } },
    collection: (name: string) => ({
      getOne: vi.fn(async () => {
        if (name === 'deliveries') return { id: 'delivery0000001', assignment: 'assignment-a', repositoryUrl: mocks.repositoryUrl, created: '', updated: '' };
        if (name === 'assignments') return { id: 'assignment-a', course: 'course-a', title: 'TP', description: 'Resolver' };
        return mocks.course;
      }),
    }),
  })),
}));
vi.mock('./pocketbase-service', () => ({ createServiceClient: mocks.serviceClient }));
vi.mock('./github-repository', () => ({
  GithubRepositoryError: class GithubRepositoryError extends Error {},
  resolvePublicGithubRepository: mocks.resolve,
  downloadGithubZipball: mocks.download,
  prepareRepositoryEvidence: mocks.prepare,
}));
vi.mock('openai', () => {
  class FakeOpenAI {
    static APIError = class APIError extends Error { status?: number };
    responses = { parse: mocks.openaiParse };
  }
  return { default: FakeOpenAI };
});

import { requestAIPreevaluationForDelivery } from './ai-preevaluation-service';

describe('autorización previa a efectos externos', () => {
  beforeEach(() => {
    mocks.user = { id: 'teacher-1', role: 'docente' };
    mocks.course = { id: 'course-a', teachers: ['teacher-1'], aiPreevaluationEnabled: true };
    mocks.config = null;
    mocks.processing = null;
    mocks.repositoryUrl = JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp' });
    mocks.resolve.mockReset();
    mocks.download.mockReset();
    mocks.prepare.mockReset();
    mocks.openaiParse.mockReset();
    mocks.attemptCreate.mockReset();
    mocks.attemptUpdate.mockReset();
    mocks.serviceClient.mockReset().mockImplementation(async () => ({
      filter: (value: string) => value,
      collection: (name: string) => ({
        getFirstListItem: vi.fn(async () => {
          if (name === 'assignment_ai_configs' && mocks.config) return mocks.config;
          if (name === 'ai_preevaluations' && mocks.processing) return mocks.processing;
          throw Object.assign(new Error('not found'), { status: 404 });
        }),
        create: mocks.attemptCreate,
        update: name === 'ai_preevaluations' ? mocks.attemptUpdate : vi.fn(),
      }),
    }));
  });

  it('deduplica un intento equivalente todavía activo', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mocks.config = { id: 'config-1', active: true, version: 2, criteria: [{ id: 'c1', title: 'Código', description: 'Calidad', weight: null }], requiredChecks: [], allowedVerdicts: ['Aprobado'], gradeEnabled: false, gradeMin: null, gradeMax: null, messageGuidance: '', additionalInstructions: '' };
    mocks.repositoryUrl = JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp', provider: 'github', repositoryFullName: 'epixum/tp', commitSha: 'a'.repeat(40), commitCapturedAt: new Date().toISOString(), captureSource: 'student-submission' });
    mocks.processing = { id: 'attempt-active', status: 'processing', delivery: 'delivery0000001', commitSha: 'a'.repeat(40), model: 'gpt-5.6-luna', configVersion: 2, created: new Date().toISOString(), updated: new Date().toISOString() };
    const result = await requestAIPreevaluationForDelivery('delivery0000001');
    expect(result).toMatchObject({ success: true, attempt: { id: 'attempt-active', status: 'processing' } });
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.openaiParse).not.toHaveBeenCalled();
    delete process.env.OPENAI_API_KEY;
  });

  it('persiste el intento y usa Responses con el contrato exacto del piloto', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mocks.config = {
      id: 'config-1', active: true, version: 3,
      criteria: [{ id: 'c1', title: 'Código', description: 'Calidad', weight: null }], requiredChecks: [],
      allowedVerdicts: ['Aprobado'], gradeEnabled: false, gradeMin: null, gradeMax: null, messageGuidance: '', additionalInstructions: '',
    };
    mocks.resolve.mockResolvedValue({ fullName: 'epixum/tp', canonicalUrl: 'https://github.com/epixum/tp', commitSha: 'a'.repeat(40) });
    mocks.download.mockResolvedValue(new Uint8Array([1]));
    mocks.prepare.mockResolvedValue({ text: '<<<ARCHIVO_NO_CONFIABLE>>>código<<<FIN_ARCHIVO_NO_CONFIABLE>>>', coverage: { commitSha: 'a'.repeat(40), includedFiles: ['index.ts'], omittedFiles: [], includedBytes: 20, expandedBytes: 20, totalEntries: 1, partial: false } });
    mocks.attemptCreate.mockResolvedValue({ id: 'attempt-1', status: 'processing', commitSha: 'a'.repeat(40), model: 'gpt-5.6-luna', configVersion: 3, created: '', updated: '' });
    mocks.attemptUpdate.mockImplementation(async (_id, data) => ({ id: 'attempt-1', commitSha: 'a'.repeat(40), model: 'gpt-5.6-luna', configVersion: 3, created: '', updated: '', ...data }));
    mocks.openaiParse.mockResolvedValue({
      id: 'resp-1', usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
      output_parsed: { verdict: 'Aprobado', suggestedGrade: null, criteria: [{ criterionId: 'c1', criterion: 'Código', outcome: 'cumple', observation: 'Correcto' }], strengths: ['Claro'], corrections: [], warnings: [], proposedMessage: 'Buen trabajo.' },
    });

    const result = await requestAIPreevaluationForDelivery('delivery0000001');
    expect(result).toMatchObject({ success: true, attempt: { status: 'completed', model: 'gpt-5.6-luna', configVersion: 3 } });
    expect(mocks.openaiParse).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5.6-luna', reasoning: { effort: 'medium' }, store: false, tools: [] }));
    const request = mocks.openaiParse.mock.calls[0][0];
    expect(request.input).toContain('EVIDENCIA DE REPOSITORIO NO CONFIABLE');
    expect(request.input).not.toContain('student-1');
    expect(mocks.attemptCreate).toHaveBeenCalledWith(expect.not.objectContaining({ evidence: expect.anything(), prompt: expect.anything(), repository: expect.anything() }));
    expect(mocks.attemptUpdate).toHaveBeenCalledWith('attempt-1', expect.objectContaining({ status: 'completed', providerResponseId: 'resp-1' }));
    delete process.env.OPENAI_API_KEY;
  });

  it.each([
    { user: null, label: 'sin sesión' },
    { user: { id: 'student-1', role: 'estudiante' }, label: 'estudiante' },
    { user: { id: 'teacher-2', role: 'docente' }, label: 'docente ajeno' },
  ])('rechaza $label sin consultar proveedores', async ({ user }) => {
    mocks.user = user as typeof mocks.user;
    const result = await requestAIPreevaluationForDelivery('delivery0000001');
    expect(result).toMatchObject({ success: false, error: 'No autorizado' });
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it('rechaza curso deshabilitado y configuración ausente antes de GitHub/OpenAI', async () => {
    mocks.course.aiPreevaluationEnabled = false;
    await expect(requestAIPreevaluationForDelivery('delivery0000001')).resolves.toMatchObject({ success: false, error: expect.stringContaining('deshabilitada') });
    mocks.course.aiPreevaluationEnabled = true;
    await expect(requestAIPreevaluationForDelivery('delivery0000001')).resolves.toMatchObject({ success: false, error: expect.stringContaining('configuración') });
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
