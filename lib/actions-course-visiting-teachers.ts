'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertNotCourseBedel } from '@/lib/course-bedel-access';
import { isEnrolledInCourse } from '@/lib/course-role-access';
import { VISITING_TEACHERS, type VisitingTeacherAssignment } from '@/lib/course-visiting-teacher-access';
import { getErrorStatus } from '@/lib/errors';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import type { Course, User } from '@/types';

async function requireAdmin() {
  const pb = await createServerClient();
  if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') throw new Error('No autorizado.');
  return pb;
}

export async function getCourseVisitingTeachers(courseId: string) {
  await requireAdmin();
  const pb = await createServiceClient();
  return pb.collection(VISITING_TEACHERS).getFullList<VisitingTeacherAssignment>({
    filter: pb.filter('course = {:courseId}', { courseId }),
    expand: 'visitor', fields: 'id,course,visitor,expand.visitor.name,expand.visitor.email',
  });
}

function refresh(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}/participants`);
  revalidatePath('/visitantes', 'layout');
}

export async function addVisitingTeacher(courseId: string, form: FormData) {
  try {
    const actor = await requireAdmin();
    const email = z.string().trim().toLowerCase().max(254).email().safeParse(form.get('email'));
    if (!email.success) return 'Ingresá un correo válido.';
    const pb = await createServiceClient();
    const [course, visitor] = await Promise.all([
      pb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers,guestStudents,students' }),
      pb.collection('users').getFirstListItem<User>(pb.filter('email:lower = {:email}', { email: email.data }), { fields: 'id,role,email' }),
    ]);
    const conflicts = visitor.role === 'admin' || [course.teachers, course.students, course.guestStudents].some(ids => ids?.includes(visitor.id));
    if (conflicts || await isEnrolledInCourse(pb, visitor.id, courseId)) {
      return 'La cuenta ya tiene permisos de administración, docencia o matrícula en este curso.';
    }
    await assertNotCourseBedel(pb, courseId, visitor.email);
    await actor.collection(VISITING_TEACHERS).create({ course: courseId, visitor: visitor.id });
    refresh(courseId);
    return '';
  } catch (error) {
    if (getErrorStatus(error) === 404) return 'No encontramos el curso o una cuenta con ese correo.';
    if (getErrorStatus(error) === 400) return 'No pudimos asignar la cuenta. Verificá si ya está en la lista.';
    return error instanceof Error && !getErrorStatus(error) ? error.message : 'No pudimos guardar la asignación.';
  }
}

export async function removeVisitingTeacher(courseId: string, assignmentId: string) {
  try {
    const pb = await requireAdmin();
    const assignment = await pb.collection(VISITING_TEACHERS).getOne<VisitingTeacherAssignment>(assignmentId, { fields: 'id,course' });
    if (assignment.course !== courseId) return 'La asignación no pertenece al curso.';
    await pb.collection(VISITING_TEACHERS).delete(assignment.id);
    refresh(courseId);
    return '';
  } catch {
    return 'No pudimos retirar la asignación. Actualizá la página e intentá nuevamente.';
  }
}
