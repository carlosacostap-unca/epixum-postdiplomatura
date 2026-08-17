import type { CourseContent, Link } from '@/types';
import { createServerClient } from './pocketbase-server';
import { sortCourseContents } from './course-content';

export async function getCourseContents(courseId: string) {
  const pb = await createServerClient();
  const records = await pb.collection('course_contents').getFullList<CourseContent>({
    filter: pb.filter('course = {:course}', { course: courseId }),
    sort: 'position,id',
  });
  return sortCourseContents(records);
}

export async function getCourseContentWithResources(courseId: string, contentId: string) {
  const pb = await createServerClient();
  const content = await pb.collection('course_contents').getOne<CourseContent>(contentId);
  if (content.course !== courseId) return null;
  const links = await pb.collection('links').getFullList<Link>({
    filter: pb.filter('content = {:content}', { content: contentId }),
    sort: 'created',
  });
  return { content, links };
}
