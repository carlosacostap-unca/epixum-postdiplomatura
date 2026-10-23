import type PocketBase from 'pocketbase';
import type { Course } from '@/types';
import { buildStudentProgress, studentPracticeHistory, type ProgressSource, type ProgressPractice, type ProgressResult, type ProgressAnswer, type ProgressExam, type ProgressExamAttempt } from './student-progress';

export class StudentProgressError extends Error {}
export async function requireStudentProgressCourse(pb: PocketBase, courseId: string) {
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user?.id) throw new StudentProgressError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (user.role !== 'admin' && !course.teachers?.includes(user.id)) throw new StudentProgressError('No tenés permiso para consultar el seguimiento de este curso.');
  return course;
}
export async function readStudentProgress(pb: PocketBase, service: PocketBase, courseId: string, studentId?: string) {
  const course = await requireStudentProgressCourse(pb, courseId);
  const courseFilter = service.filter('course = {:course}', { course: courseId });
  const filter = courseFilter + (studentId ? service.filter(' && student = {:student}', { student: studentId }) : '');
  const enrollments = await service.collection('course_enrollments').getFullList<{ student: string; created: string; expand?: { student?: { id: string; name?: string; firstName?: string; lastName?: string; email?: string } } }>({ filter, expand: 'student', fields: 'student,created,expand.student.id,expand.student.name,expand.student.firstName,expand.student.lastName,expand.student.email' });
  if (studentId && !enrollments.some(e => e.student === studentId)) throw new StudentProgressError('El estudiante no tiene una matrícula vigente en este curso.');
  const enabledPreparation = !!course.preparationEnabled; const enabledExams = !!course.examsEnabled;
  // Bounded field projections exclude snapshots, solutions, submitted selections and photos.
  const [quizzes, practices, practiceResults, practiceAnswers, exams, examAttempts, examResults, examAnswers] = await Promise.all([
    enabledPreparation ? service.collection('practice_quizzes').getFullList<ProgressSource['quizzes'][number]>({ filter: courseFilter, fields: 'id,title,status' }) : [],
    enabledPreparation ? service.collection('practice_attempts').getFullList<ProgressPractice>({ filter, fields: 'id,student,quiz,title,created,updated' }) : [],
    enabledPreparation ? service.collection('practice_results').getFullList<ProgressResult>({ filter, fields: 'id,attempt,student,correct,total,created,finishedAt' }) : [],
    enabledPreparation ? service.collection('practice_answers').getFullList<ProgressAnswer>({ filter, fields: 'attempt,student,created' }) : [],
    enabledExams ? service.collection('course_exams').getFullList<ProgressExam>({ filter: courseFilter, fields: 'id,title,status,opensAt,closesAt' }) : [],
    enabledExams ? service.collection('course_exam_attempts').getFullList<ProgressExamAttempt>({ filter, fields: 'id,student,exam,title,created,updated,deadline' }) : [],
    enabledExams ? service.collection('course_exam_results').getFullList<ProgressResult>({ filter, fields: 'id,attempt,student,correct,total,finishedAt,reason' }) : [],
    enabledExams ? service.collection('course_exam_answers').getFullList<ProgressAnswer>({ filter, fields: 'attempt,student,created' }) : [],
  ]);
  const source: ProgressSource = { students: enrollments.map(enrollment => { const student = enrollment.expand?.student; return { id: enrollment.student, name: [student?.firstName || student?.name, student?.lastName].filter(Boolean).join(' ') || student?.email || 'Estudiante sin nombre', email: student?.email || '', enrolledAt: enrollment.created }; }), preparationEnabled: enabledPreparation, examsEnabled: enabledExams, quizzes, practices, practiceResults, practiceAnswers, exams, examAttempts, examResults, examAnswers };
  const now = Date.now(); const rows = buildStudentProgress(source, now);
  return { course, rows, exams: exams.filter(e => e.status === 'published' || examAttempts.some(a => a.exam === e.id)), serverNow: now, preparationEnabled: enabledPreparation, examsEnabled: enabledExams, practiceHistory: studentId ? studentPracticeHistory(source, studentId) : [] };
}
