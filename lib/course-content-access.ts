import type PocketBase from 'pocketbase';
import type { Course, CourseContent } from '@/types';
import { isAdmin, isAssignedTeacher } from '@/lib/course-roles';

type AuthUser = { id: string; role?: string };

export async function requireEnabledTeacherCourse(pb: PocketBase, user: AuthUser | null, courseId: string) {
  if (!user) throw new Error('No tienes permisos para gestionar contenidos');
  const course = await pb.collection('courses').getOne<Course>(courseId, { fields: 'id,title,teachers,contentsEnabled' });
  if (!course.contentsEnabled || (!isAdmin(user) && !isAssignedTeacher(course, user.id))) {
    throw new Error('No tienes permisos para gestionar contenidos en este curso');
  }
  return course;
}

export async function requireEnabledStudentCourse(pb: PocketBase, user: AuthUser | null, courseId: string) {
  if (!user) throw new Error('No tienes permisos para consultar contenidos');
  const course = await pb.collection('courses').getOne<Course>(courseId, { fields: 'id,title,contentsEnabled' });
  if (!course.contentsEnabled) throw new Error('Los contenidos no están habilitados en este curso');
  await pb.collection('course_enrollments').getFirstListItem(
    pb.filter('course = {:course} && student = {:student}', { course: courseId, student: user.id }),
    { fields: 'id' },
  );
  return course;
}

export async function requireScopedCourseContent(pb: PocketBase, courseId: string, contentId: string) {
  const content = await pb.collection('course_contents').getOne<CourseContent>(contentId);
  if (content.course !== courseId) throw new Error('El contenido no pertenece a este curso');
  return content;
}
