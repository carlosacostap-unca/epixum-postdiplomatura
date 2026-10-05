import 'server-only';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { readAttendanceReport, requireAttendanceManager } from './course-attendance-service';

export async function getAttendanceReport(courseId: string) {
  const pb = await createServerClient();
  const { course } = await requireAttendanceManager(pb, courseId);
  const service = await createServiceClient();
  return { course, report: await readAttendanceReport(service, course.id) };
}
