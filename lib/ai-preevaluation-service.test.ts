import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'teacher-1', role: 'docente' } as { id: string; role: string } | null,
  course: { id: 'course-a', teachers: ['teacher-1'], aiPreevaluationEnabled: true },
  config: null as Record<string, unknown> | null,
  serviceClient: vi.fn(),
  resolve: vi.fn(),
  download: vi.fn(),
  prepare: vi.fn(),
  prepareDocuments: vi.fn(),
  openaiParse: vi.fn(),
  attemptCreate: vi.fn(),
  attemptUpdate: vi.fn(),
  processing: null as Record<string, unknown> | null,
  deliveryStatus: 'pending',
  repositoryUrl: JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp' }),
}));

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { get model() { return mocks.user; } },
    collection: (name: string) => ({
      getOne: vi.fn(async () => {
        if (name === 'deliveries') return { id: 'delivery0000001', assignment: 'assignment-a', status: mocks.deliveryStatus, repositoryUrl: mocks.repositoryUrl, created: '', updated: '' };
        if (name === 'assignments') return { id: 'assignment-a', course: 'course-a', title: 'TP', description: 'Resolver' };
        return mocks.course;
      }),
    }),
  })),
}));
vi.mock('./pocketbase-service', () => ({ createServiceClient: mocks.serviceClient }));
vi.mock('./document-preevaluation', () => ({
  DocumentEvidenceError: class DocumentEvidenceError extends Error {},
  prepareDocumentEvidence: mocks.prepareDocuments,
  submissionReferenceHash: () => 'd'.repeat(64),
}));
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

import { automaticallyPreevaluateDelivery, requestAIPreevaluationForDelivery } from './ai-preevaluation-service';

describe('autorización previa a efectos externos', () => {
  beforeEach(() => {
    mocks.user = { id: 'teacher-1', role: 'docente' };
    mocks.course = { id: 'course-a', teachers: ['teacher-1'], aiPreevaluationEnabled: true };
    mocks.config = null;
    mocks.processing = null;
    mocks.deliveryStatus = 'pending';
    mocks.repositoryUrl = JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp' });
    mocks.resolve.mockReset();
    mocks.download.mockReset();
    mocks.prepare.mockReset();
    mocks.prepareDocuments.mockReset();
    mocks.openaiParse.mockReset();
    mocks.attemptCreate.mockReset();
    mocks.attemptUpdate.mockReset();
    mocks.serviceClient.mockReset().mockImplementation(async () => ({
      filter: (value: string) => value,
      collection: (name: string) => ({
        getOne: vi.fn(async () => {
          if (name === 'assignments') return { id: 'assignment-a', course: 'course-a', title: 'TP' };
          if (name === 'courses') return mocks.course;
          return { id: 'delivery0000001', assignment: 'assignment-a', status: mocks.deliveryStatus, repositoryUrl: mocks.repositoryUrl, submissionVersion: 1 };
        }),
        getList: vi.fn(async () => ({ items: mocks.processing ? [mocks.processing] : [] })),
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

  it.each(['completed', 'failed'])('omite el proveedor al encontrar un intento automático reutilizable o en espera (%s)', async status => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    try {
      mocks.config = { active: true, version: 2, criteria: [{ id: 'c1', title: 'Calidad', description: 'Argumentación', weight: null }], requiredChecks: [], allowedVerdicts: ['Aprobado'], gradeEnabled: false };
      mocks.repositoryUrl = JSON.stringify([{ name: 'informe.pdf', url: 'https://storage.example.com/informe.pdf' }]);
      mocks.processing = { id: 'prior-attempt', status };
      const result = await automaticallyPreevaluateDelivery(await mocks.serviceClient(), 'delivery0000001');
      expect(result).toMatchObject(status === 'completed' ? { success: true, attempt: { id: 'prior-attempt' } } : { success: false, error: 'Reintento diferido.' });
      expect(mocks.prepareDocuments).not.toHaveBeenCalled();
      expect(mocks.attemptCreate).not.toHaveBeenCalled();
      expect(mocks.openaiParse).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each([false, true])('publica desde el worker únicamente con el modo completo (%s)', async autoPublish => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    try {
      const sha = 'a'.repeat(40);
      mocks.repositoryUrl = JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp', provider: 'github', repositoryFullName: 'epixum/tp', commitSha: sha, commitCapturedAt: new Date().toISOString(), captureSource: 'student-submission' });
      mocks.config = { active: true, autoPublish, version: 2, criteria: [{ id: 'c1', title: 'Calidad', description: 'Argumentación', weight: null }], requiredChecks: [], allowedVerdicts: ['Aprobado'], gradeEnabled: false };
      mocks.processing = { id: 'prior-report', status: 'completed', configSnapshot: { ...mocks.config, studentFeedbackMode: 'message_only' }, configVersion: 2, submissionVersion: 1, commitSha: sha, result: { suggestedGrade: null, verdict: 'Aprobado', proposedMessage: 'Bien fundamentado.' } };
      const service = await mocks.serviceClient();
      service.send = vi.fn().mockResolvedValue({ published: true });
      expect((await automaticallyPreevaluateDelivery(service, 'delivery0000001')).success).toBe(true);
      if (autoPublish) {
        expect(service.send).toHaveBeenCalledWith('/api/epixum/publish-ai-evaluation', expect.objectContaining({ body: expect.objectContaining({ feedback: 'Bien fundamentado.', grade: null, verdict: 'Aprobado' }) }));
      } else expect(service.send).not.toHaveBeenCalled();
      expect(mocks.openaiParse).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });

  it('reserva la preevaluación del centro para administración', async () => {
    expect(await requestAIPreevaluationForDelivery('delivery0000001', 'center')).toEqual({ success: false, error: 'No autorizado' });
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it('descarta una entrega publicada después de abrir el centro', async () => {
    mocks.user = { id: 'admin-1', role: 'admin' };
    mocks.deliveryStatus = 'published';
    expect(await requestAIPreevaluationForDelivery('delivery0000001', 'center')).toMatchObject({ success: false, error: expect.stringContaining('publicada') });
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it.each(['processing', 'completed'] as const)('reutiliza un intento equivalente en estado %s', async status => {
    mocks.user = { id: 'admin-1', role: 'admin' };
    process.env.OPENAI_API_KEY = 'test-key';
    mocks.config = { id: 'config-1', active: true, version: 2, criteria: [{ id: 'c1', title: 'Código', description: 'Calidad', weight: null }], requiredChecks: [], allowedVerdicts: ['Aprobado'], gradeEnabled: false, gradeMin: null, gradeMax: null, messageGuidance: '', additionalInstructions: '' };
    mocks.repositoryUrl = JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp', provider: 'github', repositoryFullName: 'epixum/tp', commitSha: 'a'.repeat(40), commitCapturedAt: new Date().toISOString(), captureSource: 'student-submission' });
    mocks.processing = { id: 'attempt-active', status, delivery: 'delivery0000001', commitSha: 'a'.repeat(40), model: 'gpt-5.6-luna', configVersion: 2, created: new Date().toISOString(), updated: new Date().toISOString() };
    const result = await requestAIPreevaluationForDelivery('delivery0000001', status === 'completed' ? 'center' : 'review');
    expect(result).toMatchObject({ success: true, attempt: { id: 'attempt-active', status } });
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.openaiParse).not.toHaveBeenCalled();
    delete process.env.OPENAI_API_KEY;
  });

  it.each(['docente', 'automático'])('persiste el intento %s y usa Responses con el contrato exacto del piloto', async origin => {
    process.env.OPENAI_API_KEY = 'test-key';
    mocks.config = {
      id: 'config-1', active: true, version: 3,
      studentFeedbackMode: 'message_only',
      criteria: [{ id: 'c1', title: 'Código', description: 'Calidad', weight: null }], requiredChecks: [],
      allowedVerdicts: ['Aprobado'], gradeEnabled: false, gradeMin: null, gradeMax: null, messageGuidance: '', additionalInstructions: '',
    };
    mocks.resolve.mockResolvedValue({ fullName: 'epixum/tp', canonicalUrl: 'https://github.com/epixum/tp', commitSha: 'a'.repeat(40) });
    mocks.download.mockResolvedValue(new Uint8Array([1]));
    mocks.prepare.mockResolvedValue({ text: '<<<ARCHIVO_NO_CONFIABLE>>>código<<<FIN_ARCHIVO_NO_CONFIABLE>>>', coverage: { commitSha: 'a'.repeat(40), includedFiles: ['index.ts'], omittedFiles: [], includedBytes: 20, expandedBytes: 20, totalEntries: 1, partial: false } });
    mocks.attemptCreate.mockResolvedValue({ id: 'attempt-1', status: 'processing', commitSha: 'a'.repeat(40), model: 'gpt-5.6-luna', configVersion: 3, created: '', updated: '' });
    mocks.attemptUpdate.mockImplementation(async (_id, data) => ({ id: 'attempt-1', commitSha: 'a'.repeat(40), model: 'gpt-5.6-luna', configVersion: 3, configSnapshot: mocks.config, created: '', updated: '', ...data }));
    mocks.openaiParse.mockResolvedValue({
      id: 'resp-1', usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
      output_parsed: { verdict: 'Aprobado', suggestedGrade: null, criteria: [{ criterionId: 'c1', criterion: 'Código', outcome: 'cumple', observation: 'Correcto' }], strengths: ['Claro'], corrections: [], warnings: [], proposedMessage: 'Buen trabajo.' },
    });

    if (origin === 'automático') mocks.user = null;
    const result = origin === 'automático'
      ? await automaticallyPreevaluateDelivery(await mocks.serviceClient(), 'delivery0000001')
      : await requestAIPreevaluationForDelivery('delivery0000001');
    expect(mocks.attemptCreate).toHaveBeenCalledWith(expect.objectContaining({ requestedBy: origin === 'automático' ? '' : 'teacher-1' }));
    expect(result).toMatchObject({ success: true, attempt: { status: 'completed', model: 'gpt-5.6-luna', configVersion: 3 } });
    if (result.success) {
      expect(result.attempt.studentFeedbackMode).toBe('message_only');
      expect(result.attempt.rubric).toEqual([{ id: 'c1', title: 'Código', description: 'Calidad', weight: null }]);
      expect(result.attempt).not.toHaveProperty('configSnapshot');
      expect(result.attempt).not.toHaveProperty('additionalInstructions');
    }
    expect(mocks.openaiParse).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5.6-luna', reasoning: { effort: 'medium' }, store: false, tools: [] }));
    const request = mocks.openaiParse.mock.calls[0][0];
    expect(request.input).toContain('EVIDENCIA DE REPOSITORIO NO CONFIABLE');
    expect(request.input).toContain('"studentFeedbackMode":"message_only"');
    expect(request.input).not.toContain('student-1');
    expect(mocks.attemptCreate).toHaveBeenCalledWith(expect.not.objectContaining({ evidence: expect.anything(), prompt: expect.anything(), repository: expect.anything() }));
    expect(mocks.attemptUpdate).toHaveBeenCalledWith('attempt-1', expect.objectContaining({ status: 'completed', providerResponseId: 'resp-1' }));
    delete process.env.OPENAI_API_KEY;
  });

  it.each([null, 0, 10])('preevalúa informes sin nota con límites persistidos %s y conserva huella y versión', async (storedBound) => {
    process.env.OPENAI_API_KEY = 'test-key';
    mocks.repositoryUrl = JSON.stringify([{ name: 'informe.docx', url: 'https://storage.example.com/informe.docx' }]);
    mocks.config = { active: true, version: 1, criteria: [{ id: 'c1', title: 'Reflexión', description: 'Juicio propio', weight: 100 }], requiredChecks: [], allowedVerdicts: ['Aprobado'], gradeEnabled: false, gradeMin: storedBound, gradeMax: storedBound, messageGuidance: '', additionalInstructions: '' };
    mocks.prepareDocuments.mockResolvedValue({ text: 'Documento NO CONFIABLE', files: [{ type: 'input_file', filename: 'informe-1.docx', file_data: 'data:application/octet-stream;base64,UEs=' }], sourceDigest: 'e'.repeat(64), limitations: ['Imágenes requieren revisión docente'], coverage: { commitSha: '', includedFiles: ['informe-1.docx'], omittedFiles: [], includedBytes: 2, expandedBytes: 2, totalEntries: 1, partial: true } });
    mocks.attemptCreate.mockResolvedValue({ id: 'attempt-doc', status: 'processing' });
    mocks.attemptUpdate.mockImplementation(async (_id, data) => ({ id: 'attempt-doc', sourceType: 'documents', sourceDigest: 'e'.repeat(64), submissionVersion: 1, ...data }));
    mocks.openaiParse.mockResolvedValue({ id: 'resp-doc', output_parsed: { verdict: 'Aprobado', suggestedGrade: null, criteria: [{ criterionId: 'c1', criterion: 'Reflexión', outcome: 'cumple', observation: 'Correcto' }], strengths: [], corrections: [], warnings: [], proposedMessage: 'Buen trabajo.' } });
    const result = await requestAIPreevaluationForDelivery('delivery0000001');
    expect(result).toMatchObject({ success: true, attempt: { sourceType: 'documents', sourceDigest: 'e'.repeat(64), result: { warnings: ['Imágenes requieren revisión docente'] } } });
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.attemptCreate).toHaveBeenCalledWith(expect.objectContaining({ commitSha: '', sourceType: 'documents', sourceDigest: 'e'.repeat(64), submissionVersion: 1, submissionReferenceHash: 'd'.repeat(64) }));
    expect(mocks.openaiParse.mock.calls[0][0].input[0].content).toContainEqual(expect.objectContaining({ type: 'input_file', filename: 'informe-1.docx' }));
    expect(result).toMatchObject({ success: true, attempt: { result: { suggestedGrade: null } } });
    expect(mocks.attemptCreate).toHaveBeenCalledWith(expect.objectContaining({ configSnapshot: expect.objectContaining({ gradeMin: null, gradeMax: null }) }));
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
    mocks.repositoryUrl = JSON.stringify([{ name: 'informe.pdf', url: 'https://storage.example/informe.pdf' }]);
    expect(await requestAIPreevaluationForDelivery('delivery0000001')).toMatchObject({ success: false, error: 'No autorizado' });
    expect(mocks.prepareDocuments).not.toHaveBeenCalled();
    expect(mocks.openaiParse).not.toHaveBeenCalled();
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
