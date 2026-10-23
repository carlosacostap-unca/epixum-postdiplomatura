import type PocketBase from 'pocketbase';
import { z } from 'zod';
import type { Course } from '@/types';
import { publicPracticeQuestions } from './preparation';
import { courseExamSchema, examAvailability, examScore, examSelections, visibleExamResult, type CourseExam, type ExamAnswerEvent, type ExamAttempt, type ExamResult, type ExamView, type ExamStudent } from './course-exams';

export class CourseExamError extends Error {}
export async function requireExamCourse(pb: PocketBase, courseId: string, mode: 'manage' | 'student') {
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user?.id) throw new CourseExamError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (!course.examsEnabled) throw new CourseExamError('Los parciales no están habilitados en este curso.');
  if (mode === 'manage') {
    if (user.role !== 'admin' && !course.teachers?.includes(user.id)) throw new CourseExamError('No tenés permiso para gestionar los parciales.');
  } else {
    const enrollment = await pb.collection('course_enrollments').getList(1, 1, { filter: pb.filter('course = {:course} && student = {:student}', { course: courseId, student: user.id }), fields: 'id' });
    if (!enrollment.items.length) throw new CourseExamError('Necesitás estar matriculado en el curso.');
  }
  return course;
}
async function resultFor(service: PocketBase, attempt: string) {
  return (await service.collection('course_exam_results').getList<ExamResult>(1, 1, { filter: service.filter('attempt = {:attempt}', { attempt }) })).items[0] ?? null;
}
async function eventsFor(service: PocketBase, attempt: string) {
  return service.collection('course_exam_answers').getFullList<ExamAnswerEvent>({ filter: service.filter('attempt = {:attempt}', { attempt }), sort: 'created,id' });
}
async function attemptFor(pb: PocketBase, service: PocketBase, courseId: string, id: string, mode: 'manage' | 'student' = 'student') {
  await requireExamCourse(pb, courseId, mode);
  const attempt = await service.collection('course_exam_attempts').getOne<ExamAttempt>(id);
  if (attempt.course !== courseId || (mode === 'student' && attempt.student !== pb.authStore.record!.id)) throw new CourseExamError('No tenés acceso a este intento.');
  return attempt;
}
export async function saveCourseExam(pb: PocketBase, service: PocketBase, courseId: string, id: string | null, input: unknown) {
  await requireExamCourse(pb, courseId, 'manage');
  const data = courseExamSchema.parse(input);
  if (id) {
    const exam = await service.collection('course_exams').getOne<CourseExam>(id);
    if (exam.course !== courseId) throw new CourseExamError('El parcial no pertenece al curso.');
    const attempts = await service.collection('course_exam_attempts').getList(1, 1, { filter: service.filter('exam = {:exam}', { exam: id }), fields: 'id' });
    if (attempts.items.length) throw new CourseExamError('Este parcial ya tiene intentos. Su contenido y programación están cerrados para conservar las condiciones de evaluación.');
  }
  return id ? service.collection('course_exams').update(id, data) : service.collection('course_exams').create({ ...data, course: courseId });
}
export type CourseExamInitialPhoto = { photoKey: string; rollback: () => Promise<void> };
export async function beginCourseExam(pb: PocketBase, service: PocketBase, courseId: string, examId: string, cameraActive: boolean, capturePhoto?: () => Promise<CourseExamInitialPhoto>) {
  await requireExamCourse(pb, courseId, 'student');
  const exam = await service.collection('course_exams').getOne<CourseExam>(examId);
  if (exam.course !== courseId || exam.status !== 'published') throw new CourseExamError('Este parcial no está disponible.');
  const previous = await service.collection('course_exam_attempts').getList<ExamAttempt>(1, 1, { filter: service.filter('exam = {:exam} && student = {:student}', { exam: examId, student: pb.authStore.record!.id }) });
  if (previous.items[0]) return previous.items[0].id;
  if (examAvailability(exam) !== 'Activo') throw new CourseExamError('El parcial sólo se puede iniciar dentro del horario de activación.');
  if (cameraActive !== true) throw new CourseExamError('Activá la cámara antes de comenzar.');
  const snapshot = courseExamSchema.parse({ title: exam.title, description: exam.description, status: exam.status, opensAt: new Date(exam.opensAt.replace(' ', 'T')).toISOString(), closesAt: new Date(exam.closesAt.replace(' ', 'T')).toISOString(), questions: exam.questions });
  if (!capturePhoto) throw new CourseExamError('Necesitás guardar una foto inicial de la cámara para comenzar.');
  const photo = await capturePhoto();
  let creating = false;
  try {
    await requireExamCourse(pb, courseId, 'student');
    const currentExam = await service.collection('course_exams').getOne<CourseExam>(examId);
    if (examAvailability(currentExam) !== 'Activo' || JSON.stringify(currentExam.questions) !== JSON.stringify(exam.questions) || currentExam.closesAt !== exam.closesAt || currentExam.opensAt !== exam.opensAt) throw new CourseExamError('Las condiciones del parcial cambiaron o ya se alcanzó el cierre. Actualizá la página.');
    creating = true;
    const attempt = await service.collection('course_exam_attempts').create({ course: courseId, exam: examId, student: pb.authStore.record!.id, title: exam.title, snapshot, deadline: snapshot.closesAt, cameraActive: true, cameraLastSeen: new Date().toISOString(), photoKey: photo.photoKey });
    return attempt.id;
  } catch (error) {
    if (creating) {
      // A failed response may follow a successful commit. Never delete its photo.
      const concurrent = await service.collection('course_exam_attempts').getList<ExamAttempt>(1, 1, { filter: service.filter('course = {:course} && exam = {:exam} && student = {:student}', { course: courseId, exam: examId, student: pb.authStore.record!.id }) });
      if (concurrent.items[0]) {
        if (concurrent.items[0].photoKey !== photo.photoKey) await photo.rollback();
        return concurrent.items[0].id;
      }
    }
    await photo.rollback();
    throw error;
  }
}
/** Unique result per attempt makes finalization safe across tabs and server workers. */
export async function finalizeCourseExam(service: PocketBase, attempt: ExamAttempt) {
  const existing = await resultFor(service, attempt.id);
  if (existing) return existing;
  const expired = Date.now() >= Date.parse(attempt.deadline.replace(' ', 'T'));
  const finishedAt = expired ? new Date(attempt.deadline.replace(' ', 'T')).toISOString() : new Date().toISOString();
  const selected = examSelections(await eventsFor(service, attempt.id), finishedAt);
  const data = { course: attempt.course, student: attempt.student, exam: attempt.exam, attempt: attempt.id, finishedAt, reason: expired ? 'expired' : 'submitted', selected, ...examScore(attempt.snapshot.questions, selected) };
  try { return await service.collection('course_exam_results').create<ExamResult>(data); }
  catch (error) { const saved = await resultFor(service, attempt.id); if (saved) return saved; throw error; }
}
export async function readCourseExamAttempt(pb: PocketBase, service: PocketBase, courseId: string, id: string, mode: 'manage' | 'student' = 'student'): Promise<ExamView> {
  const attempt = await attemptFor(pb, service, courseId, id, mode);
  let result = await resultFor(service, attempt.id);
  if (!result && Date.now() >= Date.parse(attempt.deadline.replace(' ', 'T'))) result = await finalizeCourseExam(service, attempt);
  const student = mode === 'manage' ? await service.collection('users').getOne<ExamStudent>(attempt.student, { fields: 'name,email' }) : null;
  return { id: attempt.id, examId: attempt.exam, title: attempt.title, description: attempt.snapshot.description, questions: publicPracticeQuestions(attempt.snapshot.questions), selected: result?.selected ?? examSelections(await eventsFor(service, id), attempt.deadline), deadline: attempt.deadline, serverNow: Date.now(), result: result ? visibleExamResult(result, attempt, mode) : null, ...(student ? { student: { name: student.name, email: student.email } } : {}), ...(mode === 'manage' && attempt.photoKey ? { initialPhotoUrl: `/api/parciales/${courseId}/intentos/${attempt.id}/foto` } : {}) };
}
export async function readCourseExamPhotoKey(pb: PocketBase, service: PocketBase, courseId: string, id: string) {
  const attempt = await attemptFor(pb, service, courseId, id, 'manage');
  if (!attempt.photoKey) throw new CourseExamError('Este intento no tiene foto inicial.');
  return attempt.photoKey;
}
export async function reportCourseExamCamera(pb: PocketBase, service: PocketBase, courseId: string, id: string, active: boolean) {
  const attempt = await attemptFor(pb, service, courseId, id);
  if (await resultFor(service, id)) return false;
  if (Date.now() >= Date.parse(attempt.deadline.replace(' ', 'T'))) { await finalizeCourseExam(service, attempt); return false; }
  await service.collection('course_exam_attempts').update(id, { cameraActive: active === true, cameraLastSeen: active === true ? new Date().toISOString() : '' });
  return active === true;
}
export async function answerCourseExam(pb: PocketBase, service: PocketBase, courseId: string, id: string, input: unknown) {
  const { questionId, optionId, mutationId } = z.object({ questionId: z.string().max(64), optionId: z.string().max(64), mutationId: z.string().uuid() }).strict().parse(input);
  const attempt = await attemptFor(pb, service, courseId, id);
  if (await resultFor(service, id)) return readCourseExamAttempt(pb, service, courseId, id);
  if (Date.now() >= Date.parse(attempt.deadline.replace(' ', 'T'))) { await finalizeCourseExam(service, attempt); return readCourseExamAttempt(pb, service, courseId, id); }
  const seen = Date.parse((attempt.cameraLastSeen || '').replace(' ', 'T'));
  if (!attempt.cameraActive || !Number.isFinite(seen) || Date.now() - seen > 25_000 || seen > Date.now() + 5000) throw new CourseExamError('La cámara debe estar encendida para guardar respuestas.');
  const question = attempt.snapshot.questions.find(q => q.id === questionId);
  if (!question?.options.some(o => o.id === optionId)) throw new CourseExamError('La opción no pertenece a esta pregunta.');
  try { await service.collection('course_exam_answers').create({ course: courseId, student: attempt.student, attempt: id, questionId, optionId, mutationId }); }
  catch (error) {
    const saved = await service.collection('course_exam_answers').getList(1, 1, { filter: service.filter('attempt = {:attempt} && mutationId = {:mutation}', { attempt: id, mutation: mutationId }) });
    if (!saved.items.length) throw error;
  }
  return readCourseExamAttempt(pb, service, courseId, id);
}
export async function submitCourseExam(pb: PocketBase, service: PocketBase, courseId: string, id: string) {
  const attempt = await attemptFor(pb, service, courseId, id);
  return visibleExamResult(await finalizeCourseExam(service, attempt), attempt, 'student');
}
/** Runs independently of browser sessions, including catch-up after a restart. */
export async function closeExpiredCourseExams(service: PocketBase) {
  const now = new Date().toISOString().replace('T', ' ');
  // Always take the first page: finalized attempts disappear from this query.
  while (true) {
    const attempts = await service.collection('course_exam_attempts').getList<ExamAttempt>(1, 100, { filter: service.filter('deadline <= {:now} && course_exam_results_via_attempt.id = ""', { now }), sort: 'id' });
    if (!attempts.items.length) break;
    for (const attempt of attempts.items) await finalizeCourseExam(service, attempt);
  }
}
