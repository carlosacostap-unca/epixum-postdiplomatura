// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { startLiveSession, joinLiveSession, readLiveState, executeLiveCommand } from './live-interactive';
import { readAttendanceReport, requireAttendanceManager } from './course-attendance-service';
import type { LiveSession } from './live-interactive-contract';

describe.skipIf(process.env.ATTENDANCE_INTEGRATION !== '1')('asistencia real con alumnos temporales', () => {
  it('ingreso atómico, repaso, privacidad, corrección, configuración histórica y aislamiento', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const admin = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); admin.autoCancellation(false);
    await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
    const created: { collection: string; id: string }[] = [];
    const create = async (collection: string, data: object) => { const record = await admin.collection(collection).create(data); created.push({ collection, id: record.id }); return record; };
    const user = async (name: string) => {
      const password = `Attendance-${randomUUID()}!`;
      const record = await create('users', { email: `${randomUUID()}@example.invalid`, name, role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false); await pb.collection('users').authWithPassword(record.email, password);
      return { pb, id: record.id };
    };
    const deny = async (operation: Promise<unknown>) => expect(operation).rejects.toBeDefined();
    try {
      const teacher = await user('Docente temporal asistencia');
      const student = await user('Alumno presente temporal');
      const absent = await user('Alumno ausente temporal');
      const outsider = await user('Usuario ajeno temporal');
      const course = await create('courses', { title: `Asistencia QA ${randomUUID().slice(0, 8)}`, teachers: [teacher.id], interactiveClassesEnabled: true, attendanceEnabled: true, status: 'borrador' });
      const cls = await create('classes', { title: 'Clase temporal', course: course.id });
      await create('course_enrollments', { course: course.id, student: student.id });
      await create('course_enrollments', { course: course.id, student: absent.id });
      const lesson = await create('interactive_lessons', { course: course.id, class: cls.id, title: 'Material temporal', status: 'ready', material: JSON.parse(await readFile('public/interactive-class-example.json', 'utf8')) });
      await requireAttendanceManager(teacher.pb, course.id);
      await deny(requireAttendanceManager(student.pb, course.id));
      await deny(requireAttendanceManager(outsider.pb, course.id));
      await deny(teacher.pb.collection('courses').update(course.id, { attendanceEnabled: false }));
      const live = await startLiveSession(teacher.pb, course.id, lesson.id);
      expect(live.attendanceEnabled).toBe(true);
      await deny(teacher.pb.collection('interactive_sessions').update(live.id, { attendanceEnabled: false, expectedRevision: live.revision, revision: 'b'.repeat(24) }));
      const resolver = async (code: string) => (await admin.collection('interactive_sessions').getList<LiveSession>(1, 1, { filter: admin.filter('code = {:code}', { code }) })).items[0] || null;
      await deny(joinLiveSession(outsider.pb, live.code, resolver));
      await Promise.all([joinLiveSession(student.pb, live.code, resolver), joinLiveSession(student.pb, live.code, resolver)]);
      let report = await readAttendanceReport(admin, course.id);
      const cell = (id: string) => report.rows.find(row => row.student.id === id)!.cells[cls.id];
      expect(cell(student.id).status).toBe('present');
      expect(cell(absent.id).status).toBe('pending');
      const firstJoined = cell(student.id).firstJoinedAt;
      const participant = await admin.collection('interactive_participants').getFirstListItem(admin.filter('session = {:session} && student = {:student}', { session: live.id, student: student.id }));
      await deny(student.pb.collection('interactive_participants').update(participant.id, { created: '2020-01-01 00:00:00.000Z' }));
      const adjustment = await admin.collection('course_attendance_adjustments').create({ course: course.id, class: cls.id, student: student.id, actor: teacher.id, actorName: 'Docente temporal asistencia', status: 'absent' });
      for (const account of [teacher, student, outsider]) {
        await deny(account.pb.collection('course_attendance_adjustments').getList(1, 10));
        await deny(account.pb.collection('course_attendance_adjustments').getOne(adjustment.id));
        await deny(account.pb.collection('course_attendance_adjustments').create({ course: course.id, class: cls.id, student: student.id, status: 'present', actor: account.id, actorName: 'Falso' }));
        await deny(account.pb.collection('course_attendance_adjustments').update(adjustment.id, { status: 'present' }));
      }
      await joinLiveSession(student.pb, live.code, resolver);
      await executeLiveCommand(student.pb, live.id, { kind: 'heartbeat' });
      await executeLiveCommand(teacher.pb, live.id, { kind: 'finish', revision: live.revision });
      await readLiveState(student.pb, live.id); // Repaso no modifica asistencia.
      await deny(joinLiveSession(absent.pb, live.code, resolver));
      await deny(absent.pb.collection('interactive_participants').create({ session: live.id, student: absent.id, joinCode: live.code, ping: 'late' }));
      await admin.collection('courses').update(course.id, { attendanceEnabled: false });
      report = await readAttendanceReport(admin, course.id);
      expect(cell(student.id)).toMatchObject({ status: 'absent', firstJoinedAt: firstJoined });
      expect(cell(student.id).corrections).toHaveLength(1);
      expect(cell(absent.id).status).toBe('absent');
      const untracked = await startLiveSession(teacher.pb, course.id, lesson.id);
      expect(untracked.attendanceEnabled).toBe(false);
      await joinLiveSession(absent.pb, untracked.code, resolver);
      report = await readAttendanceReport(admin, course.id);
      expect(cell(absent.id).status).toBe('absent');
      expect((await admin.collection('interactive_participants').getList(1, 1, { filter: admin.filter('session = {:session}', { session: live.id }) })).totalItems).toBe(1);
    } finally {
      const failures = [];
      for (const record of created.reverse()) {
        try { await admin.collection(record.collection).delete(record.id); } catch (error) { if (!(error && typeof error === 'object' && 'status' in error && error.status === 404)) failures.push(record); }
      }
      expect(failures, 'Limpieza de datos temporales').toEqual([]);
    }
  }, 120_000);
});
