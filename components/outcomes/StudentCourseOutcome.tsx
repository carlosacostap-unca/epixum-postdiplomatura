import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { readOwnCourseOutcome, requireOutcomeCourse } from '@/lib/course-outcome-service';
import { OutcomeError, type PublishedOutcome } from '@/lib/course-outcomes';
import { OutcomeCard } from './OutcomeCard';

export async function StudentCourseOutcome({ courseId }: { courseId: string }) {
  let result: PublishedOutcome | null;
  try {
    const pb = await createServerClient();
    await requireOutcomeCourse(pb, courseId, 'student');
    result = await readOwnCourseOutcome(pb, await createServiceClient(), courseId);
  } catch (error) {
    if (error instanceof OutcomeError) return null;
    throw error;
  }
  return <OutcomeCard result={result} />;
}
