import type PocketBase from 'pocketbase';
import type { Course } from '@/types';
import { gradePractice, practiceQuizSchema, publicPracticeQuestions, type PracticeAttempt, type PracticeQuiz, type PracticeResult } from './preparation';

export class PreparationError extends Error {}
export async function requirePreparationCourse(pb: PocketBase, courseId: string, mode: 'teacher' | 'student') {
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user?.id) throw new PreparationError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (!course.preparationEnabled) throw new PreparationError('Preparación no está habilitada en este curso.');
  if (mode === 'teacher') {
    if (!course.teachers?.includes(user.id)) throw new PreparationError('No tenés permisos para gestionar la preparación de este curso.');
  } else {
    const enrolled = await pb.collection('course_enrollments').getList(1, 1, { filter: pb.filter('course = {:course} && student = {:student}', { course: courseId, student: user.id }), fields: 'id' });
    if (!enrolled.totalItems) throw new PreparationError('Necesitás una matrícula vigente en este curso.');
  }
  return course;
}

async function resultFor(service: PocketBase, attemptId: string): Promise<PracticeResult | null> {
  const result = await service.collection('practice_results').getList<PracticeResult>(1, 1, { filter: service.filter('attempt = {:attempt}', { attempt: attemptId }) });
  return result.items[0] ?? null;
}

export async function startPractice(pb: PocketBase, service: PocketBase, courseId: string, quizId: string) {
  await requirePreparationCourse(pb, courseId, 'student');
  const quiz = await service.collection('practice_quizzes').getOne<PracticeQuiz>(quizId);
  if (quiz.course !== courseId || quiz.status !== 'published') throw new PreparationError('Esta práctica no está disponible para iniciar.');
  const snapshot = practiceQuizSchema.parse({ title: quiz.title, description: quiz.description, status: quiz.status, questions: quiz.questions });
  await requirePreparationCourse(pb, courseId, 'student');
  const attempt = await service.collection('practice_attempts').create<PracticeAttempt>({ course: courseId, quiz: quiz.id, student: pb.authStore.record!.id, title: snapshot.title, snapshot });
  return attempt.id;
}

export async function readPracticeAttempt(pb: PocketBase, service: PocketBase, courseId: string, attemptId: string, mode: 'teacher' | 'student' = 'student') {
  await requirePreparationCourse(pb, courseId, mode);
  const attempt = await service.collection('practice_attempts').getOne<PracticeAttempt>(attemptId);
  if (attempt.course !== courseId || (mode === 'student' && attempt.student !== pb.authStore.record!.id)) throw new PreparationError('No tenés acceso a este intento.');
  const result = await resultFor(service, attempt.id);
  return { id: attempt.id, title: attempt.title, created: attempt.created, description: attempt.snapshot.description, questions: publicPracticeQuestions(attempt.snapshot.questions), result };
}

export async function finishPractice(pb: PocketBase, service: PocketBase, courseId: string, attemptId: string, answers: unknown) {
  await requirePreparationCourse(pb, courseId, 'student');
  const attempt = await service.collection('practice_attempts').getOne<PracticeAttempt>(attemptId);
  if (attempt.course !== courseId || attempt.student !== pb.authStore.record!.id) throw new PreparationError('No tenés acceso a este intento.');
  const previous = await resultFor(service, attempt.id);
  if (previous) return previous;
  const grade = gradePractice(attempt.snapshot.questions, answers);
  await requirePreparationCourse(pb, courseId, 'student');
  try {
    return await service.collection('practice_results').create<PracticeResult>({ attempt: attempt.id, course: courseId, student: attempt.student, title: attempt.title, ...grade });
  } catch (error) {
    // A unique index lets the first successful finalization win, across workers.
    const concurrent = await resultFor(service, attempt.id);
    if (concurrent) return concurrent;
    throw error;
  }
}

export function preparationPage(value: unknown) {
  const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n < 100000 ? n : 1;
}

export async function practiceHistory(pb: PocketBase, service: PocketBase, courseId: string, mode: 'teacher' | 'student', page = 1) {
  await requirePreparationCourse(pb, courseId, mode);
  const filter = service.filter('course = {:course}', { course: courseId }) + (mode === 'student' ? service.filter(' && student = {:student}', { student: pb.authStore.record!.id }) : '');
  const attempts = await service.collection('practice_attempts').getList<PracticeAttempt & { expand?: { student?: { name?: string } } }>(preparationPage(page), 20, { filter, sort: '-created,-id', fields: 'id,course,student,title,created,expand.student.name', expand: mode === 'teacher' ? 'student' : undefined });
  const ids = attempts.items.map(a => service.filter('attempt = {:id}', { id: a.id }));
  const results = ids.length ? await service.collection('practice_results').getFullList<PracticeResult>({ filter: `(${ids.join(' || ')})`, fields: 'id,attempt,correct,total,percentage,created' }) : [];
  return { ...attempts, items: attempts.items.map(a => ({ id: a.id, title: a.title, created: a.created, studentName: mode === 'teacher' ? a.expand?.student?.name || 'Alumno' : '', result: results.find(r => r.attempt === a.id) ?? null })) };
}
