import { beforeEach, expect, it, vi } from 'vitest';
import { setCourseAttendance, correctCourseAttendance } from './actions-course-attendance';
const m = vi.hoisted(() => ({
  user: { id: 'teacher00000001', role: 'estudiante', name: 'Docente Prueba' }, valid: true,
  course: { id: 'course000000001', interactiveClassesEnabled: true, teachers: ['teacher00000001'] },
  editable: true, service: vi.fn(), update: vi.fn(), create: vi.fn(), refresh: vi.fn(),
}));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({ authStore: { isValid: m.valid, record: m.user }, collection: () => ({ getOne: async () => m.course }) }) }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: () => m.service() }));
vi.mock('next/cache', () => ({ revalidatePath: m.refresh }));
vi.mock('./course-attendance-service', async importOriginal => {
  const actual = await importOriginal<typeof import('./course-attendance-service')>();
  return { ...actual, readAttendanceReport: async () => ({ rows: [{ student: { id: 'student00000001' }, cells: { class0000000001: { editable: m.editable } } }] }) };
});
const input = { studentId: 'student00000001', classId: 'class0000000001', status: 'present' };
beforeEach(() => {
  m.valid = true; m.editable = true;
  m.user = { id: 'teacher00000001', role: 'estudiante', name: 'Docente Prueba' };
  m.course = { id: 'course000000001', interactiveClassesEnabled: true, teachers: ['teacher00000001'] };
  m.update.mockReset(); m.create.mockReset(); m.refresh.mockReset();
  m.service.mockReset().mockResolvedValue({ collection: () => ({ update: m.update, create: m.create }) });
});
it.each(['teacher', 'admin'])('permite configurar al %s y solo cambia el flag del curso', async kind => {
  if (kind === 'admin') m.user = { ...m.user, id: 'admin0000000001', role: 'admin' };
  expect(await setCourseAttendance(m.course.id, true)).toEqual({ success: true });
  expect(m.update).toHaveBeenCalledWith(m.course.id, { attendanceEnabled: true });
});
it.each(['anonymous', 'outsider', 'disabled'])('rechaza %s antes de crear el cliente privilegiado', async kind => {
  if (kind === 'anonymous') m.valid = false;
  if (kind === 'outsider') m.user = { ...m.user, id: 'outsider0000001', role: 'docente' };
  if (kind === 'disabled') m.course.interactiveClassesEnabled = false;
  expect((await setCourseAttendance(m.course.id, true)).success).toBe(false);
  expect((await correctCourseAttendance(m.course.id, input)).success).toBe(false);
  expect(m.service).not.toHaveBeenCalled();
});
it('registra autor desde la sesión y no acepta suplantación ni estados adicionales', async () => {
  expect((await correctCourseAttendance(m.course.id, { ...input, actor: 'victim' })).success).toBe(false);
  expect((await correctCourseAttendance(m.course.id, { ...input, status: 'justified' })).success).toBe(false);
  expect(m.create).not.toHaveBeenCalled();
  expect((await correctCourseAttendance(m.course.id, input)).success).toBe(true);
  expect(m.create).toHaveBeenCalledWith({ course: m.course.id, class: input.classId, student: input.studentId, status: 'present', actor: m.user.id, actorName: 'Docente Prueba' });
});
it('rechaza clase/alumno ajenos, clase futura y matrícula posterior', async () => {
  expect((await correctCourseAttendance(m.course.id, { ...input, classId: 'otherclass00001' })).success).toBe(false);
  expect((await correctCourseAttendance(m.course.id, { ...input, studentId: 'otherstudent001' })).success).toBe(false);
  m.editable = false;
  expect((await correctCourseAttendance(m.course.id, input)).success).toBe(false);
  expect(m.create).not.toHaveBeenCalled();
});
it('permite corregir historia aunque el seguimiento esté desactivado para sesiones nuevas', async () => {
  expect((await setCourseAttendance(m.course.id, false)).success).toBe(true);
  expect((await correctCourseAttendance(m.course.id, input)).success).toBe(true);
});
it('no anuncia éxito si falla la persistencia', async () => {
  m.create.mockRejectedValue(new Error('internal details'));
  const result = await correctCourseAttendance(m.course.id, input);
  expect(result.success).toBe(false);
  expect(JSON.stringify(result)).not.toContain('internal details');
  expect(m.refresh).not.toHaveBeenCalled();
});
