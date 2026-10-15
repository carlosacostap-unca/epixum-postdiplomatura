import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Assignment, Delivery } from '@/types';

const mocks = vi.hoisted(() => ({
  user: { id: 'student-1', role: 'estudiante' } as { id: string; role: string } | null,
  enrolled: true,
  assignment: {} as Assignment,
  delivery: {} as Delivery,
  create: vi.fn(), update: vi.fn(), configUpdate: vi.fn(), serialize: vi.fn(),
}));
vi.mock('./pocketbase-server', () => ({ createServerClient: vi.fn(async () => ({
  authStore: { get model() { return mocks.user; } },
  filter: (_: string, values: unknown) => JSON.stringify(values),
  collection: (name: string) => ({
    getOne: async () => {
      if (name === 'assignments') return structuredClone(mocks.assignment);
      if (name === 'deliveries') return structuredClone(mocks.delivery);
      if (name === 'courses') return { id: 'course-1', teachers: ['teacher-1'], organizationMode: 'tradicional' };
      throw new Error('not found');
    },
    getFirstListItem: async () => { if (!mocks.enrolled) throw new Error('not enrolled'); return { id: 'enrollment-1' }; },
    update: mocks.configUpdate,
  }),
})) }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: vi.fn(async () => ({ collection: (name: string) => ({
  getOne: async () => structuredClone(name === 'assignments' ? mocks.assignment : mocks.delivery),
  create: mocks.create, update: mocks.update,
}) })) }));
vi.mock('./delivery-github', () => ({ serializeDeliveryUrlForAssignment: mocks.serialize }));
vi.mock('./s3', () => ({ getPresignedUploadUrl: vi.fn(), getPresignedDownloadUrl: vi.fn(), configureBucketCors: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createDelivery, createDeliveryWithFiles, createDeliveryWithUrl, updateDelivery, updateDeliveryWithFiles, updateDeliveryWithUrl, updateAssignmentLateSubmissions } from './actions';

const files = [{ name: 'informe.pdf', url: 'https://files.example/informe.pdf' }];
function form() { const f = new FormData(); f.set('assignmentId', 'assignment-1'); f.set('repositoryUrl', 'https://example.com/entrega'); f.set('allowLateSubmissions', 'true'); return f; }
const creates = [
  ['legado', () => createDelivery(form())],
  ['archivos', () => createDeliveryWithFiles('assignment-1', 'course-1', files)],
  ['URL', () => createDeliveryWithUrl('assignment-1', 'course-1', 'https://example.com/entrega')],
] as const;
const updates = [
  ['legado', () => updateDelivery('delivery-1', form())],
  ['archivos', () => updateDeliveryWithFiles('delivery-1', 'course-1', 'assignment-1', files)],
  ['URL', () => updateDeliveryWithUrl('delivery-1', 'course-1', 'assignment-1', 'https://example.com/v2')],
] as const;

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-16T10:00:00Z'));
  mocks.user = { id: 'student-1', role: 'estudiante' }; mocks.enrolled = true;
  mocks.assignment = { id: 'assignment-1', course: 'course-1', dueDate: '2026-10-15T19:00:00.000Z', allowLateSubmissions: false } as Assignment;
  mocks.delivery = { id: 'delivery-1', assignment: 'assignment-1', student: 'student-1', status: 'pending', submissionVersion: 1, submittedAt: '2026-10-14T10:00:00Z', created: '2026-10-14T10:00:00Z', repositoryUrl: 'https://example.com/v1', deadlineSnapshot: { dueDate: '2026-10-15T19:00:00.000Z', late: false } } as Delivery;
  mocks.create.mockResolvedValue({ id: 'new' }); mocks.update.mockResolvedValue({}); mocks.configUpdate.mockResolvedValue({});
  mocks.serialize.mockResolvedValue(JSON.stringify({ type: 'url', url: 'https://example.com/entrega' }));
});
afterEach(() => vi.useRealTimers());

describe('altas tardías', () => {
  it.each(creates)('bloquea %s vencido sin confiar en permiso enviado por alumno', async (_, send) => {
    expect(await send()).toMatchObject({ success: false }); expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(creates)('acepta %s habilitado y registra vencimiento/hora servidor', async (_, send) => {
    mocks.assignment.allowLateSubmissions = true;
    expect(await send()).toMatchObject({ success: true });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ submittedAt: '2026-10-16T10:00:00.000Z', deadlineSnapshot: { dueDate: '2026-10-15T19:00:00.000Z', late: true } }));
  });
  it.each(creates)('rechaza %s de alumno no matriculado aunque haya permiso tardío', async (_, send) => {
    mocks.assignment.allowLateSubmissions = true; mocks.enrolled = false;
    expect(await send()).toMatchObject({ success: false }); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('revalida permiso y hora después de capturar URL', async () => {
    mocks.assignment.allowLateSubmissions = true;
    mocks.serialize.mockImplementationOnce(async () => { mocks.assignment.allowLateSubmissions = false; return 'url'; });
    expect(await createDeliveryWithUrl('assignment-1', 'course-1', 'https://example.com')).toMatchObject({ success: false });
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.assignment.dueDate = '2026-10-16T10:00:01Z';
    mocks.serialize.mockImplementationOnce(async () => { vi.setSystemTime(new Date('2026-10-16T10:00:02Z')); return 'url'; });
    expect(await createDeliveryWithUrl('assignment-1', 'course-1', 'https://example.com')).toMatchObject({ success: false });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('admite igualdad exacta y sin vencimiento sin marca tardía', async () => {
    mocks.assignment.dueDate = '2026-10-16T10:00:00Z';
    expect(await createDeliveryWithFiles('assignment-1', 'course-1', files)).toMatchObject({ success: true });
    expect(mocks.create.mock.calls[0][0].deadlineSnapshot.late).toBe(false);
    mocks.assignment.dueDate = '';
    await createDeliveryWithFiles('assignment-1', 'course-1', files);
    expect(mocks.create.mock.calls[1][0].deadlineSnapshot).toEqual({ dueDate: null, late: false });
  });
});

describe('modificaciones y reenvíos', () => {
  it.each(updates)('bloquea %s sin permiso y acepta con permiso conservando historial', async (_, send) => {
    expect(await send()).toMatchObject({ success: false }); expect(mocks.update).not.toHaveBeenCalled();
    mocks.assignment.allowLateSubmissions = true;
    expect(await send()).toMatchObject({ success: true });
    const patch = mocks.update.mock.calls[0][1];
    expect(patch.deadlineSnapshot.late).toBe(true); expect(patch.history[0].deadlineSnapshot.late).toBe(false);
    expect(patch.submissionVersion).toBe(2);
  });
  it.each(updates)('mantiene corrección solicitada %s sin permiso general', async (_, send) => {
    Object.assign(mocks.delivery, { status: 'published', verdict: 'Corregir y reenviar', feedback: 'Revisar' });
    expect(await send()).toMatchObject({ success: true, resubmitted: true });
  });
  it.each(updates)('no reabre aprobado ni permite modificar entrega ajena en %s', async (_, send) => {
    mocks.assignment.allowLateSubmissions = true;
    Object.assign(mocks.delivery, { status: 'published', verdict: 'Aprobado' });
    expect(await send()).toMatchObject({ success: false }); expect(mocks.update).not.toHaveBeenCalled();
    mocks.delivery.student = 'other'; mocks.delivery.status = 'pending';
    expect(await send()).toMatchObject({ success: false }); expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe('configuración restringida al responsable', () => {
  it.each(['admin', 'docente'])('permite %s autorizado y sólo cambia la opción', async role => {
    mocks.user = { id: 'teacher-1', role };
    expect(await updateAssignmentLateSubmissions('assignment-1', true)).toEqual({ success: true });
    expect(mocks.configUpdate).toHaveBeenCalledWith('assignment-1', { allowLateSubmissions: true });
    await updateAssignmentLateSubmissions('assignment-1', false);
    expect(mocks.configUpdate).toHaveBeenLastCalledWith('assignment-1', { allowLateSubmissions: false });
  });
  it('rechaza estudiante, docente ajeno, anónimo y valor no booleano', async () => {
    expect(await updateAssignmentLateSubmissions('assignment-1', true)).toMatchObject({ success: false });
    mocks.user = { id: 'other-teacher', role: 'docente' };
    expect(await updateAssignmentLateSubmissions('assignment-1', true)).toMatchObject({ success: false });
    mocks.user = null;
    expect(await updateAssignmentLateSubmissions('assignment-1', true)).toMatchObject({ success: false });
    mocks.user = { id: 'teacher-1', role: 'docente' };
    expect(await updateAssignmentLateSubmissions('assignment-1', 'false' as never)).toMatchObject({ success: false });
    expect(mocks.configUpdate).not.toHaveBeenCalled();
  });
});
