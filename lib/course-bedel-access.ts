import 'server-only';
import type PocketBase from 'pocketbase';
import { getErrorStatus } from '@/lib/errors';
import type { CourseBedel } from '@/lib/course-bedels';

export async function hasBedelCourses(pb: PocketBase) {
  const user = pb.authStore.model;
  if (!user?.email || !user.verified) return false;
  try {
    const result = await pb.collection('course_bedels').getList(1, 1, {
      filter: pb.filter('email:lower = {:email}', { email: String(user.email).trim().toLowerCase() }),
      fields: 'id',
    });
    return result.totalItems > 0;
  } catch (error) {
    // Allow an additive rollout before the new collection is installed.
    if (getErrorStatus(error) === 404) return false;
    throw error;
  }
}

export async function requireBedelAssignment(pb: PocketBase, courseId: string) {
  const user = pb.authStore.model;
  if (!pb.authStore.isValid || !user?.email || !user.verified) {
    throw new Error('Ingresá con el email verificado al que se asignó el curso.');
  }
  return pb.collection('course_bedels').getFirstListItem<CourseBedel>(
    pb.filter('course = {:courseId} && email:lower = {:email}', {
      courseId, email: String(user.email).trim().toLowerCase(),
    }),
    { fields: 'id,course' },
  );
}

// The service client is supplied only by already-authorized enrollment/admin actions.
export async function assertNotCourseBedel(pb: PocketBase, courseId: string, email: string) {
  if (!email) return;
  try {
    await pb.collection('course_bedels').getFirstListItem(
      pb.filter('course = {:courseId} && email:lower = {:email}', { courseId, email: email.trim().toLowerCase() }),
      { fields: 'id' },
    );
  } catch (error) {
    if (getErrorStatus(error) === 404) return;
    throw error;
  }
  throw new Error('Esta persona es bedel del curso. Retirá esa asignación antes de cambiar su participación.');
}
