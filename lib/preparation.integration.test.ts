// @vitest-environment node
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { describe, it, expect } from 'vitest';
import { startPractice, readPracticeAttempt, finishPractice, practiceHistory, answerPractice } from './preparation-service';

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
      const q2 = { ...q, id: 'q2', prompt: 'Segunda pregunta', explanation: 'Solución que aún no debe revelarse.' };
      const quiz = await teacher.pb.collection('practice_quizzes').create({ course: course.id, title: 'Práctica temporal', description: '', status: 'published', questions: [q, q2] });
      // Course deletion cascades these records; retain a draft to verify empty questions.
      await teacher.pb.collection('practice_quizzes').create({ course: course.id, title: 'Borrador vacío', status: 'draft', questions: [] });
      await expect(student.pb.collection('practice_quizzes').getOne(quiz.id)).rejects.toBeDefined();
      await expect(outsider.pb.collection('practice_quizzes').update(quiz.id, { title: 'No autorizado' })).rejects.toBeDefined();
      await expect(teacher.pb.collection('courses').update(course.id, { preparationEnabled: false })).rejects.toBeDefined();
      await expect(teacher.pb.collection('practice_quizzes').update(quiz.id, { course: elsewhere.id })).rejects.toBeDefined();
      await expect(startPractice(outsider.pb, admin, course.id, quiz.id)).rejects.toBeDefined();
      const attempt = await startPractice(student.pb, admin, course.id, quiz.id);
      expect(await startPractice(student.pb, admin, course.id, quiz.id)).toBe(attempt);
      const view = await readPracticeAttempt(student.pb, admin, course.id, attempt);
      expect(view.result).toBeNull(); expect(JSON.stringify(view)).not.toContain('correctOptionId'); expect(JSON.stringify(view)).not.toContain(q.explanation);
      await expect(student.pb.collection('practice_attempts').getOne(attempt)).rejects.toBeDefined();
      await expect(other.pb.collection('practice_attempts').getOne(attempt)).rejects.toBeDefined();
      await expect(readPracticeAttempt(other.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(finishPractice(other.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(finishPractice(student.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(answerPractice(other.pb, admin, course.id, attempt, 'q1', 'a')).rejects.toBeDefined();
      await expect(answerPractice(student.pb, admin, elsewhere.id, attempt, 'q1', 'a')).rejects.toBeDefined();
      await expect(answerPractice(student.pb, admin, course.id, attempt, 'q1', 'x')).rejects.toBeDefined();
      await expect(answerPractice(student.pb, admin, course.id, attempt, 'q2', 'a')).rejects.toBeDefined();
      await expect(student.pb.collection('practice_answers').create({ course: course.id, attempt, student: student.id, questionId: 'q1', selectedOptionId: 'a' })).rejects.toBeDefined();
      const first = await answerPractice(student.pb, admin, course.id, attempt, 'q1', 'a');
      expect(first.feedback).toHaveLength(1); expect(first.feedback[0].correct).toBe(true); expect(first.result).toBeNull();
      expect(JSON.stringify(first)).not.toContain(q2.explanation);
      expect((await answerPractice(student.pb, admin, course.id, attempt, 'q1', 'b')).feedback[0].selectedOptionId).toBe('a');
      const anotherSession = new PocketBase(admin.baseURL); anotherSession.authStore.save(student.pb.authStore.token, student.pb.authStore.record);
      expect((await readPracticeAttempt(anotherSession, admin, course.id, attempt)).feedback).toEqual(first.feedback);
      expect((await readPracticeAttempt(teacher.pb, admin, course.id, attempt, 'teacher')).feedback).toEqual(first.feedback);
      const savedAnswer = await admin.collection('practice_answers').getFirstListItem(admin.filter('attempt = {:id}', { id: attempt }));
      await expect(student.pb.collection('practice_answers').getOne(savedAnswer.id)).rejects.toBeDefined();
      await expect(student.pb.collection('practice_answers').update(savedAnswer.id, { selectedOptionId: 'b' })).rejects.toBeDefined();
      const fresh = await startPractice(student.pb, admin, course.id, quiz.id, true);
      expect(fresh).not.toBe(attempt); expect((await readPracticeAttempt(student.pb, admin, course.id, fresh)).feedback).toHaveLength(0);
      expect((await readPracticeAttempt(student.pb, admin, course.id, attempt)).feedback).toHaveLength(1);
      await expect(student.pb.collection('practice_results').create({ course: course.id, attempt, student: student.id, title: 'Fraude', correct: 1, total: 1, percentage: 100, review: [] })).rejects.toBeDefined();
      await teacher.pb.collection('practice_quizzes').update(quiz.id, { questions: [{ ...q, correctOptionId: 'b' }, q2], status: 'archived' });
      await expect(startPractice(student.pb, admin, course.id, quiz.id, true)).rejects.toBeDefined();
      expect(await startPractice(student.pb, admin, course.id, quiz.id)).toBe(fresh);
      const responses = await Promise.all([answerPractice(student.pb, admin, course.id, attempt, 'q2', 'a'), answerPractice(student.pb, admin, course.id, attempt, 'q2', 'b')]);
      expect(responses[0].feedback).toEqual(responses[1].feedback);
      expect(responses[0].result?.id).toBe(responses[1].result?.id);
      expect(responses[0].result?.review[0].correct).toBe(true);
      const submissions = await Promise.all([finishPractice(student.pb, admin, course.id, attempt), finishPractice(student.pb, admin, course.id, attempt)]);
      expect(submissions[0].id).toBe(submissions[1].id);
      const score = submissions[0].percentage;
      expect((await finishPractice(student.pb, admin, course.id, attempt)).percentage).toBe(score);
      await expect(student.pb.collection('practice_results').update(submissions[0].id, { percentage: 0 })).rejects.toBeDefined();
      await expect(other.pb.collection('practice_results').getOne(submissions[0].id)).rejects.toBeDefined();
      expect((await student.pb.collection('practice_results').getOne(submissions[0].id)).percentage).toBe(score);
      expect((await teacher.pb.collection('practice_results').getOne(submissions[0].id)).percentage).toBe(score);
      expect((await practiceHistory(student.pb, admin, course.id, 'student')).items).toHaveLength(2);
      expect((await practiceHistory(student.pb, admin, course.id, 'student')).items.find(a => a.id === attempt)?.answeredCount).toBe(2);
      expect((await practiceHistory(other.pb, admin, course.id, 'student')).items).toHaveLength(0);
      expect((await practiceHistory(teacher.pb, admin, course.id, 'teacher')).items[0].studentName).toBe('Alumno temporal');
      await admin.collection('courses').update(course.id, { preparationEnabled: false });
      await expect(readPracticeAttempt(student.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(teacher.pb.collection('practice_quizzes').getOne(quiz.id)).rejects.toBeDefined();
      await expect(student.pb.collection('practice_results').getOne(submissions[0].id)).rejects.toBeDefined();
      await admin.collection('courses').update(course.id, { preparationEnabled: true });
      expect((await readPracticeAttempt(student.pb, admin, course.id, attempt)).result?.percentage).toBe(score);
      // Historical completed attempts had a result but no individual answer records.
      await admin.collection('practice_results').create({ ...submissions[0], id: undefined, attempt: fresh });
      expect((await readPracticeAttempt(student.pb, admin, course.id, fresh)).result?.percentage).toBe(score);
      expect((await readPracticeAttempt(student.pb, admin, course.id, fresh)).feedback).toHaveLength(0);
      await admin.collection('course_enrollments').delete(enrollment.id);
      await expect(readPracticeAttempt(student.pb, admin, course.id, attempt)).rejects.toBeDefined();
      await expect(answerPractice(student.pb, admin, course.id, attempt, 'q2', 'a')).rejects.toBeDefined();
      await expect(student.pb.collection('practice_results').getOne(submissions[0].id)).rejects.toBeDefined();
    } finally {
      for (const record of created.reverse()) { try { await admin.collection(record.collection).delete(record.id); } catch (error) { if ((error as { status?: number }).status !== 404) throw error; } }
    }
  }, 120000);
});
