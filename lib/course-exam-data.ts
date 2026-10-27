import 'server-only';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { CourseExamError, closeExpiredCourseExams, readCourseExamAttempt, requireExamCourse } from './course-exam-service';
import { examSummary, examFeedbackReleased, examResultSummary, type CourseExam, type ExamAttempt, type ExamResult, type ExamStudent } from './course-exams';

export async function getCourseExams(courseId: string, mode: 'manage' | 'student', examId?: string) {
  const pb = await createServerClient();
  const course = await requireExamCourse(pb, courseId, mode);
  const service = await createServiceClient();
  const filter = service.filter('course = {:course}', { course: courseId });
  const rows = await service.collection('course_exams').getFullList<CourseExam>({ filter: filter + (mode === 'student' ? ' && status = "published"' : ''), fields: 'id,course,title,description,status,opensAt,closesAt,sessions', sort: '-created,id' });
  const exams = rows.map(examSummary);
  if (examId && !exams.some(exam => exam.id === examId)) throw new CourseExamError('El parcial no pertenece a este curso o no está disponible.');
  const examFilter = examId ? service.filter(' && exam = {:exam}', { exam: examId }) : '';
  const scope = filter + examFilter + (mode === 'student' ? service.filter(' && student = {:student}', { student: pb.authStore.record!.id }) : '');
  const attempts = await service.collection('course_exam_attempts').getFullList<Pick<ExamAttempt, 'id' | 'exam' | 'student' | 'created' | 'deadline'> & { expand?: { student?: ExamStudent } }>({ filter: scope, fields: `id,exam,student,created,deadline${mode === 'manage' ? ',expand.student.name,expand.student.email' : ''}`, expand: mode === 'manage' ? 'student' : undefined, sort: '-created,id' });
  const storedResults = await service.collection('course_exam_results').getFullList<ExamResult>({ filter: scope, fields: 'id,attempt,finishedAt,reason,correct,total,percentage' });
  const results = storedResults.map(result => {
    const attempt = attempts.find(a => a.id === result.attempt);
    return examResultSummary(result, mode === 'manage' || (!!attempt && examFeedbackReleased(attempt.deadline)));
  });
  return { course, exams: examId ? exams.filter(exam => exam.id === examId) : exams, attempts, results };
}
export async function getCourseExamRoster(courseId: string, examId: string) {
  return getCourseExams(courseId, 'manage', examId);
}
export async function getCourseExamEditor(courseId: string, examId?: string) {
  const pb = await createServerClient();
  const course = await requireExamCourse(pb, courseId, 'manage');
  const service = await createServiceClient();
  const exam = examId ? await service.collection('course_exams').getOne<CourseExam>(examId) : null;
  if (exam && exam.course !== courseId) throw new CourseExamError('El parcial no pertenece al curso.');
  return { course, exam };
}
export async function getCourseExamAttempt(courseId: string, id: string, mode: 'manage' | 'student' = 'student') {
  const pb = await createServerClient();
  const course = await requireExamCourse(pb, courseId, mode);
  return { course, attempt: await readCourseExamAttempt(pb, await createServiceClient(), courseId, id, mode) };
}
export async function getCourseExamStart(courseId: string, id: string) {
  const pb = await createServerClient();
  const course = await requireExamCourse(pb, courseId, 'student');
  const service = await createServiceClient();
  const row = await service.collection('course_exams').getOne<CourseExam>(id, { fields: 'id,course,title,description,status,opensAt,closesAt,sessions' });
  const exam = examSummary(row);
  if (exam.course !== courseId || exam.status !== 'published') throw new CourseExamError('El parcial no está disponible.');
  const previous = await service.collection('course_exam_attempts').getList(1, 1, { filter: service.filter('course = {:course} && exam = {:exam} && student = {:student}', { course: courseId, exam: id, student: pb.authStore.record!.id }), fields: 'id' });
  return { course, exam, existingAttemptId: previous.items[0]?.id || null };
}
// Explicit entrypoint for externally scheduled runs on hosts without a persistent Node process.
export async function expireCourseExams() { await closeExpiredCourseExams(await createServiceClient()); }
