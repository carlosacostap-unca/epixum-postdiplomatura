import 'server-only';
import type PocketBase from 'pocketbase';
import { getErrorStatus } from '@/lib/errors';

export const VISITING_TEACHERS = 'course_visiting_teachers';

export interface VisitingTeacherAssignment {
  id: string;
  course: string;
  visitor: string;
  expand?: { visitor?: { name?: string; email: string } };
}

async function findAssignments(pb: PocketBase, visitor: string, course?: string) {
  const filter = course
    ? pb.filter('visitor = {:visitor} && course = {:course}', { visitor, course })
    : pb.filter('visitor = {:visitor}', { visitor });
  try {
    return await pb.collection(VISITING_TEACHERS).getFullList<VisitingTeacherAssignment>({
      filter, fields: 'id,course,visitor',
    });
  } catch (error) {
    if (getErrorStatus(error) === 404) return [];
    throw error;
  }
}

export async function getVisitingTeacherAssignments(pb: PocketBase, course?: string) {
  const user = pb.authStore.model;
  if (!pb.authStore.isValid || !user?.verified) return [];
  return findAssignments(pb, user.id, course);
}

export async function requireVisitingTeacherAssignment(pb: PocketBase, course: string) {
  if (!course || !(await getVisitingTeacherAssignments(pb, course)).length) {
    throw Object.assign(new Error('El curso no está asignado a esta cuenta.'), { status: 404 });
  }
}

export async function assertNotVisitingTeacher(pb: PocketBase, course: string, visitor: string) {
  if ((await findAssignments(pb, visitor, course)).length) {
    throw new Error('Esta persona es docente visitante del curso. Retirá esa asignación antes de cambiar su participación.');
  }
}
