// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { describe, it, expect } from 'vitest';
import { startLiveSession, joinLiveSession, readLiveState, executeLiveCommand } from './live-interactive';
import type { LiveSession } from './live-interactive-contract';

describe.skipIf(process.env.LIVE_INTEGRATION !== '1')('sesiones reales en PocketBase', () => {
  it('transacciones, privacidad, concurrencia, reconexión e historial', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const admin = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
    admin.autoCancellation(false);
    await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
    const fixtures: { collection: string; id: string }[] = [];
    const create = async (collection: string, data: object) => {
      const record = await admin.collection(collection).create(data);
      fixtures.push({ collection, id: record.id }); return record;
    };
    const user = async (name: string) => {
      const password = `Live-${randomUUID()}!`;
      const record = await create('users', { email: `${randomUUID()}@example.invalid`, name, role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false);
      await pb.collection('users').authWithPassword(record.email, password);
      return { pb, id: record.id };
    };
    const deny = async (promise: Promise<unknown>) => { await expect(promise).rejects.toBeDefined(); };
    try {
      const teacher = await user('Docente prueba vivo');
      const student = await user('Alumna prueba vivo');
      const other = await user('Otra alumna');
      const outsider = await user('Sin matrícula');
      const course = await create('courses', { title: 'Prueba sesiones en vivo', teachers: [teacher.id], status: 'borrador', interactiveClassesEnabled: true });
      const classRecord = await create('classes', { course: course.id, title: 'Clase de prueba' });
      const enrollment = await create('course_enrollments', { course: course.id, student: student.id });
      await create('course_enrollments', { course: course.id, student: other.id });
      const material = JSON.parse(await readFile('public/interactive-class-example.json', 'utf8'));
      const teacherNotes = Object.fromEntries(material.screens.map((s: { id: string }) => [s.id, `GUION PRIVADO ${s.id}`]));
      const lesson = await create('interactive_lessons', { course: course.id, class: classRecord.id, title: 'Material vivo', material, teacherNotes, status: 'ready' });
      await deny(student.pb.collection('interactive_lessons').getOne(lesson.id));
      const starts = await Promise.all([startLiveSession(teacher.pb, course.id, lesson.id), startLiveSession(teacher.pb, course.id, lesson.id)]);
      expect(starts[0].id).toBe(starts[1].id);
      const id = starts[0].id;
      const resolver = async (code: string) => (await admin.collection('interactive_sessions').getList<LiveSession>(1, 1, { filter: admin.filter('code = {:code}', { code }) })).items[0] || null;
      await deny(student.pb.collection('interactive_sessions').getOne(id));
      await deny(joinLiveSession(outsider.pb, starts[0].code, resolver));
      await joinLiveSession(student.pb, starts[0].code, resolver);
      await joinLiveSession(student.pb, starts[0].code, resolver);
      await joinLiveSession(other.pb, starts[0].code, resolver);
      expect((await readLiveState(teacher.pb, id)).role).toBe('teacher');
      const teacherState = await readLiveState(teacher.pb, id);
      if (teacherState.role !== 'teacher') throw Error('teacher');
      expect(teacherState.participants).toHaveLength(2);
      expect(teacherState.material.screens[0].teacherNotes).toBe(`GUION PRIVADO ${material.screens[0].id}`);
      await admin.collection('interactive_lessons').update(lesson.id, { teacherNotes: {} });
      expect(teacherState.participants.some((p) => p.name === 'Alumna prueba vivo')).toBe(true);
      expect((await student.pb.collection('interactive_session_materials').getList(1, 10)).totalItems).toBe(0);
      const snapshot = await admin.collection('interactive_session_materials').getFirstListItem(admin.filter('session = {:id}', { id }));
      await deny(student.pb.collection('interactive_session_materials').getOne(snapshot.id));
      const commands = await Promise.allSettled([
        executeLiveCommand(teacher.pb, id, { kind: 'screen', revision: starts[0].revision, index: 1 }),
        executeLiveCommand(teacher.pb, id, { kind: 'screen', revision: starts[0].revision, index: 2 }),
      ]);
      expect(commands.filter((c) => c.status === 'fulfilled')).toHaveLength(1);
      // Bypass application checks to prove the database compares the old revision.
      await deny(teacher.pb.collection('interactive_sessions').update(id, { expectedRevision: starts[0].revision, revision: 'b'.repeat(24), screenIndex: 3 }));
      await deny(student.pb.collection('interactive_sessions').update(id, { expectedRevision: starts[0].revision, revision: 'c'.repeat(24), status: 'closed' }));
      let state = await readLiveState(teacher.pb, id);
      await executeLiveCommand(teacher.pb, id, { kind: 'screen', revision: state.session.revision, index: 1 });
      state = await readLiveState(teacher.pb, id);
      await executeLiveCommand(teacher.pb, id, { kind: 'activity', revision: state.session.revision, open: true });
      const studentState = await readLiveState(student.pb, id);
      expect(JSON.stringify(studentState)).not.toContain('correctOptionId');
      expect(JSON.stringify(studentState)).not.toContain('explanation');
      expect(JSON.stringify(studentState)).not.toContain('teacherNotes');
      expect(JSON.stringify(studentState)).not.toContain('GUION PRIVADO');
      expect(JSON.stringify(await student.pb.collection('interactive_sessions').getOne(id))).not.toContain('GUION PRIVADO');
      expect(studentState).not.toHaveProperty('material');
      const session = studentState.session;
      const response = { kind: 'answer' as const, revision: session.revision, screenId: session.screenId, answer: 'a' };
      await deny(executeLiveCommand(student.pb, id, { ...response, answer: 'invalid' }));
      await deny(student.pb.collection('interactive_responses').create({ session: id, student: student.id, screenId: session.screenId, screenRevision: session.revision, answer: 'invalid' }));
      const saved = await Promise.all([executeLiveCommand(student.pb, id, response), executeLiveCommand(student.pb, id, response)]);
      expect(saved[0]).toEqual(saved[1]);
      expect((await readLiveState(other.pb, id)).ownAnswer).toBeNull();
      expect((await other.pb.collection('interactive_responses').getList(1, 20)).totalItems).toBe(0);
      await executeLiveCommand(teacher.pb, id, { kind: 'activity', revision: session.revision, open: false });
      await deny(executeLiveCommand(other.pb, id, response));
      await deny(other.pb.collection('interactive_responses').create({ session: id, student: other.id, screenId: session.screenId, screenRevision: session.revision, answer: 'a' }));
      expect(await executeLiveCommand(student.pb, id, response)).toEqual(saved[0]);
      await admin.collection('course_enrollments').delete(enrollment.id);
      await deny(readLiveState(student.pb, id));
      state = await readLiveState(teacher.pb, id);
      await executeLiveCommand(teacher.pb, id, { kind: 'finish', revision: state.session.revision });
      const closed = await readLiveState(teacher.pb, id);
      await deny(teacher.pb.collection('interactive_sessions').update(id, { expectedRevision: closed.session.revision, revision: 'a'.repeat(24), status: 'live' }));
      await teacher.pb.collection('interactive_lessons').delete(lesson.id);
      const report = await readLiveState(teacher.pb, id, session.screenId);
      expect(report.session.lesson).toBe('');
      if (report.role !== 'teacher') throw Error('teacher');
      expect(report.answers).toHaveLength(1);
      expect(report.material.screens).toHaveLength(material.screens.length);
      expect(report.material.screens[0].teacherNotes).toBe(`GUION PRIVADO ${material.screens[0].id}`);
      await admin.collection('courses').update(course.id, { interactiveClassesEnabled: false });
      await deny(readLiveState(teacher.pb, id));
    } finally {
      const errors: string[] = [];
      for (const fixture of fixtures.reverse()) {
        try { await admin.collection(fixture.collection).delete(fixture.id); }
        catch (error) { if (!(error && typeof error === 'object' && 'status' in error && error.status === 404)) errors.push(`${fixture.collection}/${fixture.id}`); }
      }
      expect(errors, 'Todos los registros temporales deben limpiarse').toEqual([]);
    }
  }, 120_000);
});
