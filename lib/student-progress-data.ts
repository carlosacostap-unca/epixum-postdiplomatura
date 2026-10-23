import 'server-only';
import { cache } from 'react';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { readStudentProgress, requireStudentProgressCourse } from './student-progress-service';

export const getStudentProgress = cache(async (courseId: string, studentId?: string) => {
  const pb = await createServerClient();
  await requireStudentProgressCourse(pb, courseId);
  return readStudentProgress(pb, await createServiceClient(), courseId, studentId);
});
