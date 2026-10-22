import 'server-only';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { PreparationError, requirePreparationCourse, practiceHistory, preparationPage, readPracticeAttempt } from './preparation-service';
import type { PracticeQuiz } from './preparation';

export async function getPreparation(courseId: string, mode: 'teacher' | 'student', page = 1, historyPage = 1, quizId?: string) {
  const pb = await createServerClient();
  const course = await requirePreparationCourse(pb, courseId, mode);
  const service = await createServiceClient();
  const quizzes = await service.collection('practice_quizzes').getList<Pick<PracticeQuiz, 'id' | 'title' | 'description' | 'status' | 'durationMinutes'>>(preparationPage(page), 20, {
    filter: service.filter('course = {:course}', { course: courseId }) + (mode === 'student' ? ' && status = "published"' : ''),
    sort: '-updated,id', fields: 'id,title,description,status,durationMinutes',
  });
  const history = await practiceHistory(pb, service, courseId, mode, historyPage, quizId);
  return { course, quizzes, history, historyQuizId: quizId };
}

export async function getPreparationQuiz(courseId: string, quizId?: string) {
  const pb = await createServerClient();
  const course = await requirePreparationCourse(pb, courseId, 'teacher');
  const quiz = quizId ? await pb.collection('practice_quizzes').getOne<PracticeQuiz>(quizId) : null;
  if (quiz && quiz.course !== courseId) throw new Error('El cuestionario pertenece a otro curso.');
  return { course, quiz };
}

export async function getPreparationAttempt(courseId: string, attemptId: string, mode: 'teacher' | 'student') {
  const pb = await createServerClient();
  const course = await requirePreparationCourse(pb, courseId, mode);
  const service = await createServiceClient();
  return { course, attempt: await readPracticeAttempt(pb, service, courseId, attemptId, mode) };
}

export async function getExamStart(courseId: string, quizId: string) {
  const pb = await createServerClient();
  const course = await requirePreparationCourse(pb, courseId, 'student');
  const service = await createServiceClient();
  const pending = await service.collection('practice_attempts').getList(1, 1, { filter: service.filter('course = {:course} && quiz = {:quiz} && student = {:student} && practice_results_via_attempt.id = ""', { course: courseId, quiz: quizId, student: pb.authStore.record!.id }), sort: '-created,-id', fields: 'id' });
  if (pending.items[0]) {
    const attempt = await readPracticeAttempt(pb, service, courseId, pending.items[0].id);
    if (!attempt.result) return { course, resumeId: attempt.id, quiz: null };
  }
  const quiz = await service.collection('practice_quizzes').getOne<PracticeQuiz>(quizId);
  if (quiz.course !== courseId || quiz.status !== 'published' || !quiz.durationMinutes) throw new PreparationError('Esta simulación no está disponible.');
  return { course, resumeId: null, quiz: { id: quiz.id, title: quiz.title, description: quiz.description, durationMinutes: quiz.durationMinutes, questionCount: quiz.questions.length } };
}
