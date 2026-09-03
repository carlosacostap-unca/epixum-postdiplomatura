'use server';

import type PocketBase from 'pocketbase';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { getErrorStatus } from '@/lib/errors';
import { searchCourseParticipantCandidatesWithClient } from '@/lib/course-participant-data';
import type {
  Course,
  CourseEnrollment,
  CourseParticipantKind,
  CourseParticipantMutationResult,
} from '@/types';

class ParticipantActionError extends Error {
  constructor(public readonly status: Exclude<CourseParticipantMutationResult['status'], 'success'>, message: string) {
    super(message);
  }
}

function isNotFound(error: unknown) {
  return getErrorStatus(error) === 404;
}

function normalizeIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
}

async function requireParticipantAdmin() {
  const pb = await createServerClient();
  const user = pb.authStore.model;
  if (!user || user.role !== 'admin') {
    throw new ParticipantActionError('forbidden', 'No tienes permisos para administrar participantes.');
  }
  return pb;
}

function success(message: string, affectedIds: string[]): CourseParticipantMutationResult {
  return { status: 'success', message, affectedIds };
}

function failure(error: unknown, fallback: string): CourseParticipantMutationResult {
  if (error instanceof ParticipantActionError) return { status: error.status, message: error.message };
  const status = getErrorStatus(error);
  if (status === 404) return { status: 'not-found', message: 'El curso o la participación ya no existe.' };
  if (status === 400 || status === 409) return { status: 'conflict', message: 'La participación cambió mientras realizabas la operación. Actualizá la página e intentá nuevamente.' };
  console.error(fallback, error);
  return { status: 'error', message: fallback };
}

function revalidateParticipantSurfaces(courseId: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/participants`);
  revalidatePath(`/admin/courses/${courseId}/access`);
  revalidatePath('/docentes', 'layout');
  revalidatePath('/estudiantes', 'layout');
}

async function assertUsersExist(pb: PocketBase, userIds: string[]) {
  await Promise.all(userIds.map(async (userId) => {
    try {
      await pb.collection('users').getOne(userId, { fields: 'id' });
    } catch (error) {
      if (isNotFound(error)) throw new ParticipantActionError('not-found', 'Una de las cuentas seleccionadas ya no existe.');
      throw error;
    }
  }));
}

async function enrollmentFor(pb: PocketBase, courseId: string, studentId: string) {
  try {
    return await pb.collection('course_enrollments').getFirstListItem<CourseEnrollment>(
      pb.filter('course = {:courseId} && student = {:studentId}', { courseId, studentId }),
      { fields: 'id,course,student' },
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function verifyEnrollments(servicePb: PocketBase, courseId: string, userIds: string[], expected: boolean) {
  for (const userId of userIds) {
    const enrollment = await enrollmentFor(servicePb, courseId, userId);
    if (Boolean(enrollment) !== expected) {
      throw new ParticipantActionError('conflict', 'No pudimos verificar el estado final de las matrículas.');
    }
  }
}

async function verifyTeachers(servicePb: PocketBase, courseId: string, userIds: string[], expected: boolean) {
  const course = await servicePb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers' });
  if (userIds.some((userId) => Boolean(course.teachers?.includes(userId)) !== expected)) {
    throw new ParticipantActionError('conflict', 'No pudimos verificar el estado final de las asignaciones docentes.');
  }
}

export async function searchCourseParticipantCandidates(
  courseId: string,
  target: CourseParticipantKind,
  query: string,
  page = 1,
) {
  if (target !== 'students' && target !== 'teachers') {
    throw new ParticipantActionError('conflict', 'El tipo de participación no es válido.');
  }
  await requireParticipantAdmin();
  const servicePb = await createServiceClient();
  return searchCourseParticipantCandidatesWithClient(servicePb, courseId, target, { query, page });
}

export async function addCourseStudents(courseId: string, requestedUserIds: string[]): Promise<CourseParticipantMutationResult> {
  try {
    const pb = await requireParticipantAdmin();
    const userIds = normalizeIds(requestedUserIds);
    if (userIds.length === 0) throw new ParticipantActionError('conflict', 'Seleccioná al menos una cuenta.');

    const course = await pb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers' });
    await assertUsersExist(pb, userIds);
    if (userIds.some((id) => course.teachers?.includes(id))) {
      throw new ParticipantActionError('conflict', 'Una de las personas seleccionadas ya es docente de este curso. Retirala primero de esa participación.');
    }
    const existing = await Promise.all(userIds.map((userId) => enrollmentFor(pb, courseId, userId)));
    if (existing.some(Boolean)) throw new ParticipantActionError('conflict', 'Una de las personas seleccionadas ya es alumna de este curso.');

    const servicePb = await createServiceClient();
    const batch = servicePb.createBatch();
    userIds.forEach((student) => batch.collection('course_enrollments').create({ course: courseId, student }));
    await batch.send();
    await verifyEnrollments(servicePb, courseId, userIds, true);
    revalidateParticipantSurfaces(courseId);
    return success(userIds.length === 1 ? 'Alumno agregado al curso.' : `${userIds.length} alumnos agregados al curso.`, userIds);
  } catch (error) {
    return failure(error, 'No pudimos agregar los alumnos. Intentá nuevamente.');
  }
}

export async function removeCourseStudent(courseId: string, enrollmentId: string): Promise<CourseParticipantMutationResult> {
  try {
    const pb = await requireParticipantAdmin();
    const enrollment = await pb.collection('course_enrollments').getOne<CourseEnrollment>(enrollmentId, { fields: 'id,course,student' });
    if (enrollment.course !== courseId) throw new ParticipantActionError('not-found', 'La matrícula no pertenece al curso indicado.');

    const servicePb = await createServiceClient();
    await servicePb.collection('course_enrollments').delete(enrollment.id);
    await verifyEnrollments(servicePb, courseId, [enrollment.student], false);
    revalidateParticipantSurfaces(courseId);
    return success('Alumno retirado del curso. Su actividad histórica se conserva.', [enrollment.student]);
  } catch (error) {
    return failure(error, 'No pudimos retirar al alumno. Intentá nuevamente.');
  }
}

export async function addCourseTeachers(courseId: string, requestedUserIds: string[]): Promise<CourseParticipantMutationResult> {
  try {
    const pb = await requireParticipantAdmin();
    const userIds = normalizeIds(requestedUserIds);
    if (userIds.length === 0) throw new ParticipantActionError('conflict', 'Seleccioná al menos una cuenta.');

    const course = await pb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers' });
    await assertUsersExist(pb, userIds);
    if (userIds.some((id) => course.teachers?.includes(id))) {
      throw new ParticipantActionError('conflict', 'Una de las personas seleccionadas ya es docente de este curso.');
    }
    const enrollments = await Promise.all(userIds.map((userId) => enrollmentFor(pb, courseId, userId)));
    if (enrollments.some(Boolean)) {
      throw new ParticipantActionError('conflict', 'Una de las personas seleccionadas ya es alumna de este curso. Retirala primero de esa participación.');
    }

    const servicePb = await createServiceClient();
    await servicePb.collection('courses').update(courseId, { 'teachers+': userIds });
    await verifyTeachers(servicePb, courseId, userIds, true);
    revalidateParticipantSurfaces(courseId);
    return success(userIds.length === 1 ? 'Docente agregado al curso.' : `${userIds.length} docentes agregados al curso.`, userIds);
  } catch (error) {
    return failure(error, 'No pudimos agregar los docentes. Intentá nuevamente.');
  }
}

export async function removeCourseTeacher(courseId: string, userId: string): Promise<CourseParticipantMutationResult> {
  try {
    const pb = await requireParticipantAdmin();
    const course = await pb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers' });
    if (!course.teachers?.includes(userId)) throw new ParticipantActionError('not-found', 'La asignación docente ya no existe en este curso.');

    const servicePb = await createServiceClient();
    await servicePb.collection('courses').update(courseId, { 'teachers-': [userId] });
    await verifyTeachers(servicePb, courseId, [userId], false);
    revalidateParticipantSurfaces(courseId);
    return success('Docente retirado del curso. El contenido y la actividad histórica se conservan.', [userId]);
  } catch (error) {
    return failure(error, 'No pudimos retirar al docente. Intentá nuevamente.');
  }
}
