// @vitest-environment node
import { randomUUID } from 'node:crypto';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { describe, expect, it, vi } from 'vitest';

const clients = vi.hoisted(() => ({ current: null as unknown, service: null as unknown }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => clients.current }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: async () => clients.service }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getBedelCourses, getBedelCourse, getBedelAttendance } from './course-bedel-data';
import { hasBedelCourses } from './course-bedel-access';
import { setCourseAttendance, correctCourseAttendance } from './actions-course-attendance';
import { startLiveSession, joinLiveSession, executeLiveCommand } from './live-interactive';
import type { LiveSession } from './live-interactive-contract';

describe.skipIf(process.env.BEDEL_INTEGRATION !== '1')('Bedelía contra PocketBase real', () => {
  it('asignación previa al ingreso, varios bedeles, solo lectura, asistencia real y revocación', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const admin = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); admin.autoCancellation(false);
    await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
    clients.service = admin;
    const created: { collection: string; id: string }[] = [];
    const create = async (collection: string, data: object) => {
      const record = await admin.collection(collection).create(data); created.push({ collection, id: record.id }); return record;
    };
    const user = async (email = `${randomUUID()}@example.invalid`) => {
      const password = `Bedel-${randomUUID()}!`;
      const record = await create('users', { email, name: 'Bedel QA temporal', role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false);
      await pb.collection('users').authWithPassword(email, password);
      return { pb, id: record.id, email };
    };
    try {
      const teacher = await user(); const student = await user(); const peer = await user();
      const email = `bedel-${randomUUID()}@example.invalid`;
      const course = await create('courses', { title: `Bedel QA ${randomUUID().slice(0, 8)}`, teachers: [teacher.id], interactiveClassesEnabled: true, attendanceEnabled: true, contentsEnabled: true, status: 'borrador' });
      const other = await create('courses', { title: 'Otro curso Bedel QA', status: 'borrador' });
      const first = await create('course_bedels', { course: course.id, email: email.toUpperCase(), firstName: 'Ana', lastName: 'Prueba' });
      await create('course_bedels', { course: course.id, email: peer.email, firstName: 'Otro', lastName: 'Bedel' });
      await expect(admin.collection('course_bedels').create({ course: course.id, email, firstName: 'Duplicado', lastName: 'Prueba' })).rejects.toBeDefined();
      const bedel = await user(email);
      // Keep users before courses in cleanup order even though this identity is created after its assignment.
      const bedelUser = created.pop()!; created.unshift(bedelUser);
      await create('course_bedels', { course: other.id, email, firstName: 'Ana', lastName: 'Prueba' });
      const cls = await create('classes', { course: course.id, title: 'Clase para consulta', description: '<p>Contenido visible</p>' });
      const content = await create('course_contents', { course: course.id, title: 'Material de consulta', position: 0 });
      await create('links', { content: content.id, title: 'Recurso', url: 'https://example.com/material', type: 'link' });
      await create('course_enrollments', { course: course.id, student: student.id });
      const lesson = await create('interactive_lessons', { course: course.id, class: cls.id, title: 'Clase en vivo QA', status: 'ready', material: { version: 1, screens: [{ id: 'one', type: 'content', title: 'Inicio', body: 'Texto de ejemplo' }] } });
      const session = await startLiveSession(teacher.pb, course.id, lesson.id);
      const resolver = async () => admin.collection('interactive_sessions').getOne<LiveSession>(session.id);
      await joinLiveSession(student.pb, session.code, resolver);
      await executeLiveCommand(teacher.pb, session.id, { kind: 'finish', revision: session.revision });

      clients.current = bedel.pb;
      expect(await hasBedelCourses(bedel.pb)).toBe(true);
      expect((await getBedelCourses()).map(c => c.id).sort()).toEqual([course.id, other.id].sort());
      const data = await getBedelCourse(course.id);
      expect(data.classes.map(c => c.id)).toContain(cls.id);
      expect(data.contents.map(c => c.id)).toContain(content.id);
      const attendance = await getBedelAttendance(course.id);
      expect(attendance.report?.rows.find(row => row.student.id === student.id)?.cells[cls.id]).toMatchObject({ status: 'present', editable: false });
      expect((await setCourseAttendance(course.id, false)).success).toBe(false);
      expect((await correctCourseAttendance(course.id, { classId: cls.id, studentId: student.id, status: 'absent' })).success).toBe(false);
      await expect(bedel.pb.collection('classes').update(cls.id, { title: 'No permitido' })).rejects.toBeDefined();
      await expect(bedel.pb.collection('courses').update(course.id, { title: 'No permitido' })).rejects.toBeDefined();
      await expect(bedel.pb.collection('course_bedels').create({ course: other.id, email: peer.email, firstName: 'No', lastName: 'Permitido' })).rejects.toBeDefined();
      await expect(bedel.pb.collection('course_bedels').delete(first.id)).rejects.toBeDefined();

      clients.current = peer.pb;
      expect((await getBedelCourses()).map(c => c.id)).toEqual([course.id]);
      await expect(getBedelCourse(other.id)).rejects.toBeDefined();
      await expect(getBedelAttendance(other.id)).rejects.toBeDefined();
      clients.current = bedel.pb;
      await admin.collection('course_bedels').delete(first.id);
      expect((await getBedelCourses()).map(c => c.id)).toEqual([other.id]);
      await expect(getBedelCourse(course.id)).rejects.toBeDefined();
      await expect(getBedelAttendance(course.id)).rejects.toBeDefined();
      await admin.collection('users').update(bedel.id, { verified: false });
      await bedel.pb.collection('users').authRefresh();
      expect(await hasBedelCourses(bedel.pb)).toBe(false);
      expect(await getBedelCourses()).toEqual([]);
      expect((await bedel.pb.collection('course_bedels').getList(1, 10)).totalItems).toBe(0);
    } finally {
      const failures = [];
      for (const record of created.reverse()) {
        try { await admin.collection(record.collection).delete(record.id); }
        catch (error) { if (!(error && typeof error === 'object' && 'status' in error && error.status === 404)) failures.push(record); }
      }
      clients.current = null; clients.service = null;
      expect(failures, 'Limpieza de datos temporales').toEqual([]);
    }
  }, 120_000);
});
