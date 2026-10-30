// @vitest-environment node
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { changeCourseOutcome, readCourseOutcomeRoster, readManagedCourseOutcome, readOwnCourseOutcome, requireOutcomeCourse } from './course-outcome-service';

describe.skipIf(process.env.RUN_COURSE_OUTCOME_INTEGRATION !== 'true')('resultados de cursada: PocketBase real', () => {
  let service: PocketBase, teacher: PocketBase, student: PocketBase, second: PocketBase, admin: PocketBase, outsider: PocketBase;
  let course = ''; let otherCourse = '';
  const created: { collection: string; id: string }[] = [];
  const draft = { status: 'aprobado' as const, grade: 0, feedback: 'Resultado inicial de prueba' };
  async function current() { return readManagedCourseOutcome(teacher, service, course, student.authStore.record!.id); }
  async function change(command: 'save' | 'publish' | 'withdraw', input?: unknown) {
    const { outcome } = await current();
    return changeCourseOutcome(teacher, service, course, student.authStore.record!.id, outcome?.revision || '', command, input);
  }
  beforeAll(async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    service = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); service.autoCancellation(false);
    await service.health.check();
    await service.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || '', process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || '');
    const run = randomUUID().slice(0, 8);
    const user = async (label: string, role = 'estudiante') => {
      const password = `Outcome-${randomUUID()}!`;
      const record = await service.collection('users').create({ email: `outcome-${run}-${label}@example.invalid`, name: `Prueba resultados ${label}`, role, verified: true, password, passwordConfirm: password });
      created.push({ collection: 'users', id: record.id });
      const pb = new PocketBase(service.baseURL); pb.autoCancellation(false);
      await pb.collection('users').authWithPassword(record.email, password); return pb;
    };
    teacher = await user('docente'); student = await user('alumno-a'); second = await user('alumno-b'); admin = await user('admin', 'admin'); outsider = await user('externo', 'docente');
    for (const label of ['principal', 'ajeno']) {
      const record = await service.collection('courses').create({ title: `Prueba resultados ${run} ${label}`, status: 'en curso', outcomesEnabled: true, teachers: label === 'principal' ? [teacher.authStore.record!.id] : [] });
      created.push({ collection: 'courses', id: record.id });
      if (label === 'principal') course = record.id; else otherCourse = record.id;
    }
    for (const actor of [student, second]) await service.collection('course_enrollments').create({ course, student: actor.authStore.record!.id });
  }, 60000);
  afterAll(async () => {
    const failed: string[] = [];
    for (const record of [...created].reverse()) {
      try { await service.collection(record.collection).delete(record.id); }
      catch (error) { if (!(error && typeof error === 'object' && 'status' in error && error.status === 404)) failed.push(`${record.collection}/${record.id}`); }
    }
    if (failed.length) throw new Error(`No se pudieron limpiar los datos temporales: ${failed.join(', ')}`);
  }, 60000);
  it('bloquea API directa, activación docente y gestión fuera del alcance', async () => {
    for (const actor of [teacher, student, admin]) for (const name of ['course_outcomes', 'course_outcome_history']) await expect(actor.collection(name).getList(1, 1)).rejects.toMatchObject({ status: 403 });
    await expect(teacher.collection('courses').update(course, { outcomesEnabled: false })).rejects.toMatchObject({ status: 404 });
    await expect(requireOutcomeCourse(teacher, otherCourse)).rejects.toThrow('permisos');
    await expect(requireOutcomeCourse(outsider, course)).rejects.toThrow('permisos');
    await expect(changeCourseOutcome(teacher, service, course, outsider.authStore.record!.id, '', 'save', draft)).rejects.toThrow('matrícula');
    await expect(requireOutcomeCourse(teacher, course)).resolves.toBeTruthy();
  }, 30000);
  it('conserva borradores sin nota ni devolución y no los expone a los alumnos', async () => {
    await change('save', { status: 'no_completo', grade: null, feedback: '' });
    expect((await current()).outcome?.draft).toEqual({ status: 'no_completo', grade: null, feedback: '' });
    expect(await readOwnCourseOutcome(student, service, course)).toBeNull();
    expect(await readOwnCourseOutcome(second, service, course)).toBeNull();
    expect((await readCourseOutcomeRoster(teacher, service, course)).rows).toHaveLength(2);
  }, 30000);
  it('publica nota cero para un alumno y conserva la privacidad individual', async () => {
    await change('save', draft); await change('publish');
    const visible = await readOwnCourseOutcome(student, service, course);
    expect(visible).toMatchObject(draft);
    expect(visible).not.toHaveProperty('draft'); expect(visible).not.toHaveProperty('revision'); expect(visible).not.toHaveProperty('actor');
    expect(await readOwnCourseOutcome(second, service, course)).toBeNull();
    await expect(readManagedCourseOutcome(student, service, course, second.authStore.record!.id)).rejects.toThrow('permisos');
  }, 30000);
  it('mantiene el resultado anterior durante la corrección y registra autoría al publicar y retirar', async () => {
    await change('save', { status: 'aprobado', grade: 9.5, feedback: 'Corrección privada' });
    expect(await readOwnCourseOutcome(student, service, course)).toMatchObject(draft);
    await change('publish');
    expect(await readOwnCourseOutcome(student, service, course)).toMatchObject({ grade: 9.5, feedback: 'Corrección privada' });
    await change('withdraw');
    expect(await readOwnCourseOutcome(student, service, course)).toBeNull();
    const data = await current(); expect(data.history.totalItems).toBe(6);
    expect(data.history.items.every(entry => entry.actorName === 'Prueba resultados docente' && Boolean(entry.occurredAt))).toBe(true);
    expect(data.outcome?.draft.grade).toBe(9.5);
  }, 30000);
  it('dos editores de una misma revisión confirman solo un cambio con su historial', async () => {
    const data = await current(); const revision = data.outcome!.revision;
    const attempts = await Promise.allSettled([teacher, admin].map((actor, i) => changeCourseOutcome(actor, service, course, student.authStore.record!.id, revision, 'save', { ...draft, grade: 6 + i })));
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await current()).history.totalItems).toBe(data.history.totalItems + 1);
  }, 30000);
  it('deshabilitar conserva datos y retirar la matrícula revoca acceso sin borrar historial', async () => {
    const before = await current();
    await admin.collection('courses').update(course, { outcomesEnabled: false });
    await expect(readOwnCourseOutcome(student, service, course)).rejects.toThrow('habilitados');
    await expect(requireOutcomeCourse(teacher, course)).rejects.toThrow('habilitados');
    await admin.collection('courses').update(course, { outcomesEnabled: true });
    expect((await current()).history.totalItems).toBe(before.history.totalItems);
    const enrollment = await service.collection('course_enrollments').getFirstListItem(service.filter('course = {:course} && student = {:student}', { course, student: student.authStore.record!.id }));
    await service.collection('course_enrollments').delete(enrollment.id);
    await expect(readOwnCourseOutcome(student, service, course)).rejects.toThrow('matrícula');
    await expect(current()).rejects.toThrow('matrícula');
    expect((await service.collection('course_outcomes').getOne(before.outcome!.id)).draft.grade).toBe(before.outcome!.draft.grade);
    expect((await service.collection('course_outcome_history').getList(1, 1, { filter: service.filter('outcome = {:outcome}', { outcome: before.outcome!.id }) })).totalItems).toBe(before.history.totalItems);
  }, 30000);
});
