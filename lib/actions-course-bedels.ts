'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/pocketbase-server';
import { courseBedelSchema, type BedelInput, type CourseBedel } from '@/lib/course-bedels';
import { getErrorStatus } from '@/lib/errors';
import type { Course, User } from '@/types';

async function requireAdmin() {
  const pb = await createServerClient();
  if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') {
    throw new Error('Solo administración puede asignar o retirar bedeles.');
  }
  return pb;
}

function refresh(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}/bedels`);
  revalidatePath('/bedeles', 'layout');
  revalidatePath('/', 'layout');
}

export async function addCourseBedel(courseId: string, input: BedelInput) {
  try {
    const pb = await requireAdmin();
    const parsed = courseBedelSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const data = parsed.data;
    const course = await pb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers' });
    const accounts = await pb.collection('users').getFullList<User>({
      filter: pb.filter('email:lower = {:email}', { email: data.email }), fields: 'id,role',
    });
    if (accounts.some(user => user.role === 'admin' || course.teachers?.includes(user.id))) {
      return { success: false, error: 'Esta cuenta ya tiene permisos de edición en el curso. Retirá esos permisos antes de asignarla como bedel.' };
    }
    for (const user of accounts) {
      const enrollments = await pb.collection('course_enrollments').getList(1, 1, {
        filter: pb.filter('course = {:courseId} && student = {:userId}', { courseId, userId: user.id }), fields: 'id',
      });
      if (enrollments.totalItems) return { success: false, error: 'Esta cuenta está matriculada en el curso. Retirá la matrícula antes de asignarla como bedel.' };
    }
    await pb.collection('course_bedels').create({ course: courseId, ...data });
    refresh(courseId);
    return { success: true };
  } catch (error) {
    if (getErrorStatus(error) === 400) return { success: false, error: 'No se pudo asignar el bedel. Verificá que ese email no esté asignado ya al curso.' };
    return { success: false, error: error instanceof Error && !getErrorStatus(error) ? error.message : 'No pudimos asignar el bedel. Intentá nuevamente.' };
  }
}

export async function removeCourseBedel(courseId: string, assignmentId: string) {
  try {
    const pb = await requireAdmin();
    const assignment = await pb.collection('course_bedels').getOne<CourseBedel>(assignmentId);
    if (assignment.course !== courseId) return { success: false, error: 'La asignación no pertenece al curso.' };
    await pb.collection('course_bedels').delete(assignmentId);
    refresh(courseId);
    return { success: true };
  } catch {
    return { success: false, error: 'No pudimos retirar el bedel. Actualizá la página e intentá nuevamente.' };
  }
}
