// @vitest-environment node
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { describe, it, expect } from 'vitest';
import { startPractice, readPracticeAttempt, finishPractice, practiceHistory } from './preparation-service';

describe.skipIf(process.env.PREPARATION_INTEGRATION !== '1')('preparación en PocketBase', () => {
  it('protege claves y propiedad, conserva snapshots y resuelve finalizaciones concurrentes', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const admin = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); admin.autoCancellation(false);
    await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
    const created: { collection: string; id: string }[] = [];
    const create = async (collection: string, data: object) => { const row = await admin.collection(collection).create(data); created.push({ collection, id: row.id }); return row; };
    const user = async (name: string) => {
      const password = `Practice-${randomUUID()}!`;
      const row = await create('users', { email: `${randomUUID()}@example.invalid`, name, role: 'estudiante', password, passwordConfirm: password, verified: true });
      const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false); await pb.collection('users').authWithPassword(row.email, password); return { id: row.id, pb };
    };
    try {
      const teacher = await user('Docente temporal'); const student = await user('Alumno temporal'); const other = await user('Otro alumno temporal'); const outsider = await user('Sin matrícula');
      const course = await create('courses', { title: 'Prueba preparación', status: 'borrador', teachers: [teacher.id], preparationEnabled: true });
      const elsewhere = await create('courses', { title: 'Otro curso de prueba', status: 'borrador', teachers: [outsider.id], preparationEnabled: true });
      const enrollment = await create('course_enrollments', { course: course.id, student: student.id });
      await create('course_enrollments', { course: course.id, student: other.id });
      const q = { id: 'q1', prompt: 'Elegí una opción', options: [{ id: 'a', label: 'Primera' }, { id: 'b', label: 'Segunda' }], correctOptionId: 'a', explanation: 'Explicación reservada hasta terminar.' };
      const quiz = await teacher.pb.collection('practice_quizzes').create({ course: course.id, title: 'Práctica temporal', description: '', status: 'published', questions: [q] });
      // Course deletion cascades these records; retain a draft to verify empty questions.
      await teacher.pb.collection('practice_quizzes').create({ course: course.id, title: 'Borrador vacío', status: 'draft', questions: [] });
      await expect(student.pb.collection('practice_quizzes').getOne(quiz.id)).rejects.toBeDefined();
      await expect(outsider.pb.collection('practice_quizzes').update(quiz.id, { title: 'No autorizado' })).rejects.toBeDefined();
      await expect(teacher.pb.collection('courses').update(course.id, { preparationEnabled: false })).rejects.toBeDefined();
      await expect(teacher.pb.collection('practice_quizzes').update(quiz.id, { course: elsewhere.id })).rejects.toBeDefined();
      await expect(startPractice(outsider.pb, admin, course.id, quiz.id)).rejects.toBeDefined();
      const attempt = await startPractice(student.pb, admin, course.id, quiz.id);
      const view = await readPracticeAttempt(student.pb, admin, course.id, attempt);
      expect(view.result).toBeNull(); expect(JSON.stringify(view)).not.toContain('correctOptionId'); expect(JSON.stringify(view)).not.toContain(q.explanation);
      await expect(student.pb.collection('practice_attempts').getOne(attempt)).rejects.toBeDefined();
      await expect(other.pb.collection('practice_attempts').getOne(attempt)).rejects.toBeDefined();
      await expect(readPracticeAttempt(other.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(finishPractice(other.pb, admin, course.id, attempt, { q1: 'a' })).rejects.toBeDefined();
      await expect(finishPractice(student.pb, admin, course.id, attempt, { q1: 'x' })).rejects.toBeDefined();
      await expect(student.pb.collection('practice_results').create({ course: course.id, attempt, student: student.id, title: 'Fraude', correct: 1, total: 1, percentage: 100, review: [] })).rejects.toBeDefined();
      await teacher.pb.collection('practice_quizzes').update(quiz.id, { questions: [{ ...q, correctOptionId: 'b' }], status: 'archived' });
      await expect(startPractice(student.pb, admin, course.id, quiz.id)).rejects.toBeDefined();
      const submissions = await Promise.all([finishPractice(student.pb, admin, course.id, attempt, { q1: 'a' }), finishPractice(student.pb, admin, course.id, attempt, { q1: 'a' })]);
      expect(submissions[0].id).toBe(submissions[1].id); expect(submissions[0].percentage).toBe(100);
      expect((await finishPractice(student.pb, admin, course.id, attempt, { q1: 'b' })).percentage).toBe(100);
      await expect(student.pb.collection('practice_results').update(submissions[0].id, { percentage: 0 })).rejects.toBeDefined();
      await expect(other.pb.collection('practice_results').getOne(submissions[0].id)).rejects.toBeDefined();
      expect((await student.pb.collection('practice_results').getOne(submissions[0].id)).percentage).toBe(100);
      expect((await teacher.pb.collection('practice_results').getOne(submissions[0].id)).percentage).toBe(100);
      expect((await practiceHistory(student.pb, admin, course.id, 'student')).items).toHaveLength(1);
      expect((await practiceHistory(other.pb, admin, course.id, 'student')).items).toHaveLength(0);
      expect((await practiceHistory(teacher.pb, admin, course.id, 'teacher')).items[0].studentName).toBe('Alumno temporal');
      await admin.collection('courses').update(course.id, { preparationEnabled: false });
      await expect(readPracticeAttempt(student.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(teacher.pb.collection('practice_quizzes').getOne(quiz.id)).rejects.toBeDefined();
      await expect(student.pb.collection('practice_results').getOne(submissions[0].id)).rejects.toBeDefined();
      await admin.collection('courses').update(course.id, { preparationEnabled: true });
      expect((await readPracticeAttempt(student.pb, admin, course.id, attempt)).result?.percentage).toBe(100);
      await admin.collection('course_enrollments').delete(enrollment.id);
      await expect(readPracticeAttempt(student.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(student.pb.collection('practice_results').getOne(submissions[0].id)).rejects.toBeDefined();
    } finally {
      for (const record of created.reverse()) { try { await admin.collection(record.collection).delete(record.id); } catch (error) { if ((error as { status?: number }).status !== 404) throw error; } }
    }
  }, 120000);
});
