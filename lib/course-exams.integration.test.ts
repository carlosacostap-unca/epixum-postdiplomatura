// @vitest-environment node
import { describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { answerCourseExam, beginCourseExam, closeExpiredCourseExams, readCourseExamAttempt, reportCourseExamCamera, requireExamCourse, saveCourseExam, submitCourseExam } from './course-exam-service';
import type { CourseExamInput } from './course-exams';

describe.skipIf(process.env.COURSE_EXAMS_INTEGRATION !== '1')('parciales · PocketBase real', () => {
  it('protege borradores, guarda cambios, reanuda entre sesiones y cierra sin navegador', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const service = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); service.autoCancellation(false);
    await service.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
    const created: { collection: string; id: string }[] = [];
    const create = async (collection: string, data: object) => { const record = await service.collection(collection).create(data); created.push({ collection, id: record.id }); return record; };
    const user = async (role: string) => {
      const password = `Exams-${randomUUID()}!`;
      const record = await create('users', { email: `exam-${randomUUID()}@example.invalid`, name: 'Prueba de parciales', role, verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(service.baseURL); pb.autoCancellation(false); await pb.collection('users').authWithPassword(record.email, password); return pb;
    };
    try {
      const admin = await user('admin'); const student = await user('estudiante'); const outsider = await user('estudiante');
      const course = await create('courses', { title: `Prueba parciales ${randomUUID()}`, status: 'borrador', examsEnabled: true });
      await create('course_enrollments', { course: course.id, student: student.authStore.record!.id });
      const question = { id: 'q1', prompt: 'Pregunta de prueba', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: 'Privado' };
      const input: CourseExamInput = { title: 'Parcial de prueba', description: '', status: 'draft', opensAt: '', closesAt: '', questions: [question, { ...question, id: 'q2' }] };
      const exam = await saveCourseExam(admin, service, course.id, null, input); created.push({ collection: 'course_exams', id: exam.id });
      await expect(beginCourseExam(student, service, course.id, exam.id, true)).rejects.toThrow('no está disponible');
      await expect(student.collection('course_exams').getList(1, 10)).rejects.toMatchObject({ status: 403 });
      await expect(student.collection('course_exams').getOne(exam.id)).rejects.toMatchObject({ status: 403 });
      await expect(saveCourseExam(student, service, course.id, exam.id, input)).rejects.toThrow('permiso');
      await expect(requireExamCourse(outsider, course.id, 'student')).rejects.toThrow('matriculado');
      const published = { ...input, status: 'published' as const, opensAt: new Date(Date.now() - 60_000).toISOString(), closesAt: new Date(Date.now() + 3600_000).toISOString() };
      await saveCourseExam(admin, service, course.id, exam.id, published);
      await expect(beginCourseExam(student, service, course.id, exam.id, false)).rejects.toThrow('cámara');
      const ids = await Promise.all([beginCourseExam(student, service, course.id, exam.id, true), beginCourseExam(student, service, course.id, exam.id, true)]);
      expect(ids[0]).toBe(ids[1]); const id = ids[0]; created.push({ collection: 'course_exam_attempts', id });
      await expect(saveCourseExam(admin, service, course.id, exam.id, published)).rejects.toThrow('ya tiene intentos');
      let view = await readCourseExamAttempt(student, service, course.id, id);
      expect(JSON.stringify(view)).not.toMatch(/correctOptionId|explanation|Privado/);
      await expect(readCourseExamAttempt(outsider, service, course.id, id)).rejects.toThrow();
      await expect(student.collection('course_exam_attempts').update(id, { cameraActive: true })).rejects.toMatchObject({ status: 403 });
      const mutation = randomUUID();
      view = await answerCourseExam(student, service, course.id, id, { questionId: 'q2', optionId: 'a', mutationId: mutation });
      expect(view.selected).toEqual({ q2: 'a' });
      await answerCourseExam(student, service, course.id, id, { questionId: 'q2', optionId: 'a', mutationId: mutation });
      expect((await service.collection('course_exam_answers').getFullList({ filter: service.filter('attempt = {:id}', { id }) })).length).toBe(1);
      view = await answerCourseExam(student, service, course.id, id, { questionId: 'q2', optionId: 'b', mutationId: randomUUID() });
      expect(view.selected.q2).toBe('b');
      const secondSession = new PocketBase(service.baseURL); secondSession.authStore.save(student.authStore.token, student.authStore.record);
      expect((await readCourseExamAttempt(secondSession, service, course.id, id)).selected).toEqual({ q2: 'b' });
      await reportCourseExamCamera(student, service, course.id, id, false);
      await expect(answerCourseExam(student, service, course.id, id, { questionId: 'q1', optionId: 'b', mutationId: randomUUID() })).rejects.toThrow('cámara');
      // Move this isolated fixture's deadline into the past, then run the same worker as production.
      const deadline = new Date(Date.now() - 1).toISOString();
      await service.collection('course_exam_attempts').update(id, { deadline });
      await closeExpiredCourseExams(service); await closeExpiredCourseExams(service);
      view = await readCourseExamAttempt(student, service, course.id, id);
      expect(view.result).toMatchObject({ reason: 'expired', correct: 1, total: 2, selected: { q2: 'b' } });
      expect(Date.parse(view.result!.finishedAt)).toBe(Date.parse(deadline));
      expect((await submitCourseExam(student, service, course.id, id)).id).toBe(view.result!.id);
      const late = await answerCourseExam(student, service, course.id, id, { questionId: 'q1', optionId: 'b', mutationId: randomUUID() });
      expect(late.selected).toEqual({ q2: 'b' });
      const earlyExam = await saveCourseExam(admin, service, course.id, null, { ...published, title: 'Entrega anticipada' });
      created.push({ collection: 'course_exams', id: earlyExam.id });
      const earlyId = await beginCourseExam(student, service, course.id, earlyExam.id, true);
      created.push({ collection: 'course_exam_attempts', id: earlyId });
      const earlyResult = await submitCourseExam(student, service, course.id, earlyId);
      expect(earlyResult).toMatchObject({ reason: 'submitted', feedbackAvailable: false, selected: {} });
      expect(JSON.stringify(earlyResult)).not.toMatch(/correct|percentage|total|review|Privado/);
      expect((await submitCourseExam(student, service, course.id, earlyId)).id).toBe(earlyResult.id);
      const earlyView = await readCourseExamAttempt(student, service, course.id, earlyId);
      expect(JSON.stringify(earlyView)).not.toMatch(/correct|percentage|total|review|Privado/);
      const repeatedAnswer = await answerCourseExam(student, service, course.id, earlyId, { questionId: 'q1', optionId: 'b', mutationId: randomUUID() });
      expect(repeatedAnswer.result?.feedbackAvailable).toBe(false);
      expect(JSON.stringify(repeatedAnswer)).not.toMatch(/correct|percentage|total|review|Privado/);
      const teacherView = await readCourseExamAttempt(admin, service, course.id, earlyId, 'manage');
      expect(teacherView.result).toMatchObject({ feedbackAvailable: true, correct: 0, total: 2 });
      await service.collection('course_exam_attempts').update(earlyId, { deadline: new Date(Date.now() - 1).toISOString() });
      const released = await readCourseExamAttempt(student, service, course.id, earlyId);
      expect(released.result).toMatchObject({ id: earlyResult.id, feedbackAvailable: true, correct: 0, total: 2, review: [{ selectedOptionId: null }, { selectedOptionId: null }] });
      expect(JSON.stringify(released.result)).toContain('Privado');
      await service.collection('courses').update(course.id, { examsEnabled: false });
      await expect(readCourseExamAttempt(student, service, course.id, id)).rejects.toThrow('no están habilitados');
    } finally {
      // Delete only descendants of this test's attempts; never touch live course data.
      for (const attempt of created.filter(r => r.collection === 'course_exam_attempts')) {
        for (const collection of ['course_exam_results', 'course_exam_answers']) {
          for (const row of await service.collection(collection).getFullList({ filter: service.filter('attempt = {:id}', { id: attempt.id }) })) await service.collection(collection).delete(row.id);
        }
      }
      for (const record of [...created].reverse()) await service.collection(record.collection).delete(record.id);
    }
  }, 120_000);
});
