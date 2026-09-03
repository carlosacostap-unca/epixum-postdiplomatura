import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'teacher-1', role: 'docente' } as { id: string; role: string } | null,
  course: { id: 'course-1', teachers: ['teacher-1'], aiPreevaluationEnabled: true },
  assignment: { id: 'assignment-1', course: 'course-1' },
  config: null as Record<string, unknown> | null,
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { get model() { return mocks.user; } },
    filter: (value: string) => value,
    collection: (name: string) => ({
      getOne: vi.fn(async () => name === 'assignments' ? mocks.assignment : mocks.course),
      getFirstListItem: vi.fn(async () => {
        if (!mocks.config) throw Object.assign(new Error('not found'), { status: 404 });
        return mocks.config;
      }),
      create: mocks.create,
      update: mocks.update,
    }),
  })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getAssignmentAIConfig, saveAssignmentAIConfig } from './actions-ai-config';

const valid = {
  active: true,
  criteria: [{ id: 'codigo', title: 'Código', description: 'Calidad', weight: null }],
  requiredChecks: ['Incluye README'],
  allowedVerdicts: ['Aprobado', 'Corregir y reenviar'] as const,
  gradeEnabled: false,
  gradeMin: null,
  gradeMax: null,
  messageGuidance: 'Mensaje claro',
  additionalInstructions: '',
};

describe('configuración docente de preevaluación', () => {
  beforeEach(() => {
    mocks.user = { id: 'teacher-1', role: 'docente' };
    mocks.course = { id: 'course-1', teachers: ['teacher-1'], aiPreevaluationEnabled: true };
    mocks.config = null;
    mocks.create.mockReset().mockImplementation(async (data) => ({ id: 'config-1', ...data }));
    mocks.update.mockReset().mockImplementation(async (_id, data) => ({ id: 'config-1', ...data }));
  });

  it('crea una configuración válida y activa', async () => {
    const result = await saveAssignmentAIConfig('assignment-1', { ...valid, allowedVerdicts: [...valid.allowedVerdicts] });
    expect(result).toMatchObject({ success: true, config: { active: true, version: 1 } });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ assignment: 'assignment-1', version: 1 }));
  });

  it('autoriza por asignación docente y no por el rol global heredado', async () => {
    mocks.user = { id: 'teacher-1', role: 'estudiante' };
    await expect(saveAssignmentAIConfig('assignment-1', { ...valid, allowedVerdicts: [...valid.allowedVerdicts] })).resolves.toMatchObject({ success: true });
  });

  it('incrementa la versión al editar', async () => {
    mocks.config = { id: 'config-1', assignment: 'assignment-1', version: 4, ...valid };
    const result = await saveAssignmentAIConfig('assignment-1', { ...valid, allowedVerdicts: [...valid.allowedVerdicts] });
    expect(result).toMatchObject({ success: true, config: { version: 5 } });
  });

  it('rechaza docente ajeno y curso deshabilitado', async () => {
    mocks.user = { id: 'teacher-2', role: 'docente' };
    await expect(getAssignmentAIConfig('assignment-1')).rejects.toThrow('No autorizado');
    mocks.user = { id: 'teacher-1', role: 'docente' };
    mocks.course.aiPreevaluationEnabled = false;
    await expect(saveAssignmentAIConfig('assignment-1', { ...valid, allowedVerdicts: [...valid.allowedVerdicts] })).resolves.toMatchObject({ success: false, error: expect.stringContaining('deshabilitó') });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('no activa una configuración sin criterios', async () => {
    const result = await saveAssignmentAIConfig('assignment-1', { ...valid, criteria: [], allowedVerdicts: [...valid.allowedVerdicts] });
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('criterio') });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
