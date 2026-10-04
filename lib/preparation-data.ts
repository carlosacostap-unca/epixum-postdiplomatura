import 'server-only';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { requirePreparationCourse, practiceHistory, preparationPage, readPracticeAttempt } from './preparation-service';
import type { PracticeQuiz } from './preparation';

export async function getPreparation(courseId: string, mode: 'teacher' | 'student', page = 1, historyPage = 1) {
  const pb = await createServerClient();
  const course = await requirePreparationCourse(pb, courseId, mode);
  const service = await createServiceClient();
  const quizzes = await service.collection('practice_quizzes').getList<Pick<PracticeQuiz, 'id' | 'title' | 'description' | 'status'>>(preparationPage(page), 20, {
    filter: service.filter('course = {:course}', { course: courseId }) + (mode === 'student' ? ' && status = "published"' : ''),
    sort: '-updated,id', fields: 'id,title,description,status',
  });
  const history = await practiceHistory(pb, service, courseId, mode, historyPage);
  return { course, quizzes, history };
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
