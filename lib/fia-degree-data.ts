import 'server-only';
import type PocketBase from 'pocketbase';
import type { FiaDegree } from './fia-degree';
import { fiaCourseId } from './fia-degree';

export function getFiaEnrollment(service: PocketBase, student: string) {
  return service.collection('course_enrollments').getFirstListItem<{ id: string; fiaDegree?: FiaDegree }>(
    service.filter('course = {:course} && student = {:student}', { course: fiaCourseId, student }),
    { fields: 'id,fiaDegree' },
  );
}
