import type PocketBase from 'pocketbase';
import { examRequirements, type ExamRequirementProgress } from './course-exam-requirements';
import { practiceDeadline, type PracticeAttempt } from './preparation';
import { finalizePractice } from './preparation-service';

/** Call only after authenticating and checking enrollment. Never accept a student ID from the browser. */
export async function readExamRequirements(service: PocketBase, courseId: string, examId: string, studentId: string): Promise<ExamRequirementProgress[]> {
  return Promise.all(examRequirements(courseId, examId).map(async requirement => {
    const scope = { course: courseId, student: studentId, quiz: requirement.quizId };
    const finished = await service.collection('practice_results').getList(1, 1, {
      filter: service.filter('course = {:course} && student = {:student} && attempt.course = {:course} && attempt.student = {:student} && attempt.quiz = {:quiz}', scope), fields: 'id',
    });
    if (finished.items.length) return { ...requirement, completed: true };
    // Timed simulations close even if the learner never returns to their attempt page.
    const pending = await service.collection('practice_attempts').getFullList<PracticeAttempt>({
      filter: service.filter('course = {:course} && student = {:student} && quiz = {:quiz} && practice_results_via_attempt.id = ""', scope),
    });
    const expired = pending.find(attempt => { const deadline = practiceDeadline(attempt); return deadline && Date.now() >= Date.parse(deadline); });
    if (expired) await finalizePractice(service, expired);
    return { ...requirement, completed: !!expired };
  }));
}
