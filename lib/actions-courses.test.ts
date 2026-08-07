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

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { createCourse, updateCourse } from './actions-courses';

function courseForm(mode?: 'tradicional' | 'semanal', enrollmentMode?: 'clave' | 'invitacion_contrasena') {
  const form = new FormData();
  form.set('title', 'Curso');
  form.set('description', 'Descripción');
  form.set('status', 'en curso');
  if (mode) form.set('organizationMode', mode);
  if (enrollmentMode) form.set('enrollmentMode', enrollmentMode);
  form.append('teachers', 'teacher-1');
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
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ organizationMode: 'tradicional', enrollmentMode: 'clave' }));
  });

  it('alterna la modalidad de matrícula sin limpiar credenciales existentes', async () => {
    await updateCourse('course-1', courseForm('tradicional', 'invitacion_contrasena'));
    expect(mocks.update).toHaveBeenCalledWith('course-1', expect.objectContaining({ enrollmentMode: 'invitacion_contrasena' }));
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('enrollmentKeyHash');
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('invitationPasswordHash');
  });

  it('alterna modalidad conservando relaciones enviadas', async () => {
    await updateCourse('course-1', courseForm('semanal'));
    await updateCourse('course-1', courseForm('tradicional'));

    expect(mocks.update).toHaveBeenNthCalledWith(1, 'course-1', expect.objectContaining({
      organizationMode: 'semanal', teachers: ['teacher-1'], classes: ['class-1'], assignments: ['assignment-1'], inquiries: ['inquiry-1'],
    }));
    expect(mocks.update).toHaveBeenNthCalledWith(2, 'course-1', expect.objectContaining({ organizationMode: 'tradicional' }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/docentes', 'layout');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/estudiantes', 'layout');
  });

  it.each(['docente', 'estudiante'])('rechaza cambios solicitados por rol %s', async (role) => {
    mocks.model = { id: `${role}-1`, role };
    await expect(updateCourse('course-1', courseForm('semanal'))).rejects.toThrow('No tienes permisos');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('persiste credenciales ocultas solamente mediante el cliente de servicio', async () => {
    const form = courseForm('tradicional', 'invitacion_contrasena');
    form.set('enrollmentKey', 'CLAVE-1');
    form.set('invitationPassword', 'Segura-123');

    await updateCourse('course-1', form);

    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('enrollmentKeyHash');
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('invitationPasswordHash');
    expect(mocks.serviceUpdate).toHaveBeenCalledWith('course-1', expect.objectContaining({
      enrollmentKeyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      invitationPasswordHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
  });
});
