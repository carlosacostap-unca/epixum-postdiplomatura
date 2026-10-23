'use server';
import { ZodError } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { answerCourseExam, beginCourseExam, CourseExamError, readCourseExamAttempt, reportCourseExamCamera, requireExamCourse, saveCourseExam, submitCourseExam } from './course-exam-service';

async function run<T>(course: string, operation: (pb: Awaited<ReturnType<typeof createServerClient>>, service: Awaited<ReturnType<typeof createServiceClient>>) => Promise<T>) {
  try {
    const pb = await createServerClient();
    // Authenticate before creating the privileged client, including for reads.
    if (!pb.authStore.isValid) throw new CourseExamError('Iniciá sesión para continuar.');
    return { success: true as const, data: await operation(pb, await createServiceClient()) };
  } catch (error) {
    return { success: false as const, error: error instanceof CourseExamError ? error.message : error instanceof ZodError ? error.issues[0].message : 'No pudimos completar la operación. Revisá la conexión y volvé a intentar.' };
  }
}
export async function saveExam(course: string, id: string | null, input: unknown) {
  const result = await run(course, async (pb, service) => (await saveCourseExam(pb, service, course, id, input)).id);
  if (result.success) {
    revalidatePath(`/admin/courses/${course}/parciales`, 'layout');
    revalidatePath(`/docentes/cursos/${course}/parciales`, 'layout');
    revalidatePath(`/estudiantes/cursos/${course}/parciales`, 'layout');
  }
  return result;
}
export async function beginExam(course: string, exam: string, camera: boolean) { return run(course, (pb, service) => beginCourseExam(pb, service, course, exam, camera)); }
export async function saveExamAnswer(course: string, attempt: string, input: unknown) { return run(course, (pb, service) => answerCourseExam(pb, service, course, attempt, input)); }
export async function readExam(course: string, attempt: string) { return run(course, (pb, service) => readCourseExamAttempt(pb, service, course, attempt)); }
export async function sendExam(course: string, attempt: string) { return run(course, (pb, service) => submitCourseExam(pb, service, course, attempt)); }
export async function examCamera(course: string, attempt: string, active: boolean) { return run(course, (pb, service) => reportCourseExamCamera(pb, service, course, attempt, active)); }
export async function refreshExamList(course: string) { return run(course, async pb => { await requireExamCourse(pb, course, 'student'); revalidatePath(`/estudiantes/cursos/${course}/parciales`); return true; }); }
