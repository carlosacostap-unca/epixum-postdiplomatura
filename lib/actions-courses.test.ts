import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  model: { id: 'admin-1', role: 'admin' } as { id: string; role: string } | null,
  create: vi.fn(),
  update: vi.fn(),
  serviceUpdate: vi.fn(),
  remove: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { get model() { return mocks.model; } },
    collection: () => ({ create: mocks.create, update: mocks.update, delete: mocks.remove }),
  })),
}));

vi.mock('./pocketbase-service', () => ({
  createServiceClient: vi.fn(async () => ({
    collection: () => ({ update: mocks.serviceUpdate }),
  })),
}));

vi.mock('./course-teacher-assignment', () => ({
  validateTeacherSelection: vi.fn(async (_pb, _courseId, ids: string[]) => [...new Set(ids)]),
  verifyPersistedTeachers: vi.fn(async () => undefined),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { createCourse, updateCourse } from './actions-courses';

function courseForm(mode?: 'tradicional' | 'semanal', enrollmentMode?: 'clave' | 'invitacion_contrasena', contentsEnabled = false, aiPreevaluationEnabled = false) {
  const form = new FormData();
  form.set('title', 'Curso');
  form.set('description', 'Descripción');
  form.set('status', 'en curso');
  if (mode) form.set('organizationMode', mode);
  if (enrollmentMode) form.set('enrollmentMode', enrollmentMode);
  if (contentsEnabled) form.set('contentsEnabled', 'true');
  if (aiPreevaluationEnabled) form.set('aiPreevaluationEnabled', 'true');
  form.append('classes', 'class-1');
  form.append('assignments', 'assignment-1');
  form.append('inquiries', 'inquiry-1');
  return form;
}

describe('modalidad administrativa del curso', () => {
  beforeEach(() => {
    process.env.COURSE_ENROLLMENT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
    mocks.model = { id: 'admin-1', role: 'admin' };
    mocks.create.mockReset().mockResolvedValue({ id: 'course-1' });
    mocks.update.mockReset().mockResolvedValue({ id: 'course-1' });
    mocks.serviceUpdate.mockReset().mockResolvedValue({ id: 'course-1' });
    mocks.remove.mockReset();
    mocks.revalidatePath.mockReset();
  });

  it('crea cursos tradicionales por defecto', async () => {
    await createCourse(courseForm());
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ organizationMode: 'tradicional', enrollmentMode: 'clave', contentsEnabled: false }));
  });

  it('habilita contenidos solamente cuando el administrador marca la opción', async () => {
    await createCourse(courseForm('tradicional', 'clave', true));
    await updateCourse('course-1', courseForm('tradicional', 'clave', false));

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ contentsEnabled: true }));
    expect(mocks.update).toHaveBeenCalledWith('course-1', expect.objectContaining({ contentsEnabled: false }));
  });

  it('deja la IA deshabilitada por defecto y solo el admin puede habilitarla', async () => {
    await createCourse(courseForm());
    await updateCourse('course-1', courseForm('tradicional', 'clave', false, true));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ aiPreevaluationEnabled: false }));
    expect(mocks.update).toHaveBeenCalledWith('course-1', expect.objectContaining({ aiPreevaluationEnabled: true }));
  });

  it('actualiza la configuración sin tocar docentes ni modalidad de acceso', async () => {
    await updateCourse('course-1', courseForm('semanal'));
    await updateCourse('course-1', courseForm('tradicional'));

    expect(mocks.update).toHaveBeenNthCalledWith(1, 'course-1', expect.objectContaining({
      organizationMode: 'semanal', classes: ['class-1'], assignments: ['assignment-1'], inquiries: ['inquiry-1'],
    }));
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('teachers');
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('enrollmentMode');
    expect(mocks.update).toHaveBeenNthCalledWith(2, 'course-1', expect.objectContaining({ organizationMode: 'tradicional' }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/docentes', 'layout');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/estudiantes', 'layout');
  });

  it.each(['docente', 'estudiante'])('rechaza cambios solicitados por rol %s', async (role) => {
    mocks.model = { id: `${role}-1`, role };
    await expect(updateCourse('course-1', courseForm('semanal'))).resolves.toEqual({
      success: false,
      error: 'No tienes permisos para administrar cursos',
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('ignora campos de docentes y credenciales enviados manualmente en una edición general', async () => {
    const form = courseForm('tradicional', 'invitacion_contrasena');
    form.append('teachers', 'teacher-manipulated');
    form.set('invitationPassword', 'Segura-123');
    await updateCourse('course-1', form);
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('teachers');
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('invitationPasswordHash');
    expect(mocks.serviceUpdate).not.toHaveBeenCalled();
  });
});
