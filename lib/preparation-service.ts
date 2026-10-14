import type PocketBase from 'pocketbase';
import type { Course } from '@/types';
import { gradePractice, practiceDeadline, practiceQuizSchema, publicPracticeQuestions, type PracticeAnswer, type PracticeAttempt, type PracticeQuiz, type PracticeResult } from './preparation';

export class PreparationError extends Error {}
export async function requirePreparationCourse(pb: PocketBase, courseId: string, mode: 'teacher' | 'student') {
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user?.id) throw new PreparationError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (!course.preparationEnabled) throw new PreparationError('Preparación no está habilitada en este curso.');
  if (mode === 'teacher') {
    if (user.role !== 'admin' && !course.teachers?.includes(user.id)) throw new PreparationError('No tenés permisos para gestionar la preparación de este curso.');
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

export async function startPractice(pb: PocketBase, service: PocketBase, courseId: string, quizId: string, fresh = false) {
  await requirePreparationCourse(pb, courseId, 'student');
  {
    const pending = await service.collection('practice_attempts').getList(1, 1, {
      filter: service.filter('course = {:course} && quiz = {:quiz} && student = {:student} && practice_results_via_attempt.id = ""', { course: courseId, quiz: quizId, student: pb.authStore.record!.id }),
      sort: '-created,-id', fields: 'id',
    });
    if (pending.items.length) {
      const current = await service.collection('practice_attempts').getOne<PracticeAttempt>(pending.items[0].id);
      const deadline = practiceDeadline(current);
      if (deadline && Date.now() >= Date.parse(deadline)) await finishPractice(pb, service, courseId, current.id);
      else if (!fresh || deadline) return current.id;
    }
  }
  const quiz = await service.collection('practice_quizzes').getOne<PracticeQuiz>(quizId);
  if (quiz.course !== courseId || quiz.status !== 'published') throw new PreparationError('Esta práctica no está disponible para iniciar.');
  const snapshot = practiceQuizSchema.parse({ title: quiz.title, description: quiz.description, status: quiz.status, questions: quiz.questions, durationMinutes: quiz.durationMinutes || 0 });
  await requirePreparationCourse(pb, courseId, 'student');
  const attempt = await service.collection('practice_attempts').create<PracticeAttempt>({ course: courseId, quiz: quiz.id, student: pb.authStore.record!.id, title: snapshot.title, snapshot });
  return attempt.id;
}

async function attemptFor(pb: PocketBase, service: PocketBase, courseId: string, attemptId: string, mode: 'teacher' | 'student') {
  await requirePreparationCourse(pb, courseId, mode);
  const attempt = await service.collection('practice_attempts').getOne<PracticeAttempt>(attemptId);
  if (attempt.course !== courseId || (mode === 'student' && attempt.student !== pb.authStore.record!.id)) throw new PreparationError('No tenés acceso a este intento.');
  return attempt;
}

async function answersFor(service: PocketBase, attemptId: string, deadline: string | null = null) {
  const filter = service.filter('attempt = {:attempt}', { attempt: attemptId }) + (deadline ? service.filter(' && created <= {:deadline}', { deadline: deadline.replace('T', ' ') }) : '');
  return service.collection('practice_answers').getFullList<PracticeAnswer>({ filter, fields: 'id,attempt,questionId,selectedOptionId' });
}

export async function readPracticeAttempt(pb: PocketBase, service: PocketBase, courseId: string, attemptId: string, mode: 'teacher' | 'student' = 'student') {
  const attempt = await attemptFor(pb, service, courseId, attemptId, mode);
  const deadline = practiceDeadline(attempt);
  let result = await resultFor(service, attempt.id);
  if (!result && deadline && Date.now() >= Date.parse(deadline)) result = await finalizePractice(service, attempt);
  const answers = await answersFor(service, attempt.id, deadline);
  const selected = Object.fromEntries(answers.map(a => [a.questionId, a.selectedOptionId]));
  const feedback = deadline && !result ? [] : gradePractice(attempt.snapshot.questions, selected).review.filter(r => r.selectedOptionId !== null);
  return { id: attempt.id, quizId: attempt.quiz, title: attempt.title, created: attempt.created, description: attempt.snapshot.description, questions: publicPracticeQuestions(attempt.snapshot.questions), feedback, result, selected, deadline, serverNow: Date.now() };
}

export async function finishPractice(pb: PocketBase, service: PocketBase, courseId: string, attemptId: string) {
  const attempt = await attemptFor(pb, service, courseId, attemptId, 'student');
  await requirePreparationCourse(pb, courseId, 'student');
  return finalizePractice(service, attempt);
}

async function finalizePractice(service: PocketBase, attempt: PracticeAttempt) {
  const previous = await resultFor(service, attempt.id);
  if (previous) return previous;
  const deadline = practiceDeadline(attempt);
  const answers = await answersFor(service, attempt.id, deadline);
  const grade = gradePractice(attempt.snapshot.questions, Object.fromEntries(answers.map(a => [a.questionId, a.selectedOptionId])));
  if (!deadline && grade.review.some(r => r.selectedOptionId === null)) throw new PreparationError('Confirmá todas las respuestas antes de ver el resumen final.');
  try {
    return await service.collection('practice_results').create<PracticeResult>({ attempt: attempt.id, course: attempt.course, student: attempt.student, title: attempt.title, ...grade });
  } catch (error) {
    // A unique index lets the first successful finalization win, across workers.
    const concurrent = await resultFor(service, attempt.id);
    if (concurrent) return concurrent;
    throw error;
  }
}

export async function answerPractice(pb: PocketBase, service: PocketBase, courseId: string, attemptId: string, questionId: string, optionId: string) {
  const attempt = await attemptFor(pb, service, courseId, attemptId, 'student');
  if (await resultFor(service, attempt.id)) return readPracticeAttempt(pb, service, courseId, attemptId);
  const deadline = practiceDeadline(attempt);
  if (deadline && Date.now() >= Date.parse(deadline)) {
    await finalizePractice(service, attempt);
    return readPracticeAttempt(pb, service, courseId, attemptId);
  }
  const question = attempt.snapshot.questions.find(q => q.id === questionId);
  if (!question || !question.options.some(o => o.id === optionId)) throw new PreparationError('Elegí una opción válida de esta pregunta.');
  const answers = await answersFor(service, attempt.id);
  if (!answers.some(a => a.questionId === questionId)) {
    const next = attempt.snapshot.questions.find(q => !answers.some(a => a.questionId === q.id));
    if (!deadline && next?.id !== questionId) throw new PreparationError('Respondé primero la pregunta pendiente.');
    await requirePreparationCourse(pb, courseId, 'student');
    try {
      await service.collection('practice_answers').create({ course: courseId, attempt: attemptId, student: attempt.student, questionId, selectedOptionId: optionId });
    } catch (error) {
      // First persisted answer wins even across tabs or workers. A retry returns it.
      const saved = await answersFor(service, attempt.id);
      if (!saved.some(a => a.questionId === questionId)) throw error;
    }
  }
  const saved = await answersFor(service, attempt.id);
  if (!deadline && saved.length === attempt.snapshot.questions.length) await finishPractice(pb, service, courseId, attemptId);
  return readPracticeAttempt(pb, service, courseId, attemptId);
}

export function preparationPage(value: unknown) {
  const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n < 100000 ? n : 1;
}

export async function practiceHistory(pb: PocketBase, service: PocketBase, courseId: string, mode: 'teacher' | 'student', page = 1) {
  await requirePreparationCourse(pb, courseId, mode);
  const filter = service.filter('course = {:course}', { course: courseId }) + (mode === 'student' ? service.filter(' && student = {:student}', { student: pb.authStore.record!.id }) : '');
  const attempts = await service.collection('practice_attempts').getList<PracticeAttempt & { expand?: { student?: { name?: string } } }>(preparationPage(page), 20, { filter, sort: '-created,-id', fields: 'id,course,student,title,created,snapshot,expand.student.name', expand: mode === 'teacher' ? 'student' : undefined });
  for (const attempt of attempts.items) {
    const deadline = practiceDeadline(attempt);
    if (deadline && Date.now() >= Date.parse(deadline)) await finalizePractice(service, attempt);
  }
  const ids = attempts.items.map(a => service.filter('attempt = {:id}', { id: a.id }));
  const results = ids.length ? await service.collection('practice_results').getFullList<PracticeResult>({ filter: `(${ids.join(' || ')})`, fields: 'id,attempt,correct,total,percentage,created' }) : [];
  const answers = ids.length ? await service.collection('practice_answers').getFullList<PracticeAnswer>({ filter: `(${ids.join(' || ')})`, fields: 'attempt' }) : [];
  return { ...attempts, items: attempts.items.map(a => ({ id: a.id, title: a.title, created: a.created, answeredCount: answers.filter(answer => answer.attempt === a.id).length, studentName: mode === 'teacher' ? a.expand?.student?.name || 'Alumno' : '', result: results.find(r => r.attempt === a.id) ?? null })) };
}
