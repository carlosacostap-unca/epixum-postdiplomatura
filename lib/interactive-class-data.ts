import { cache } from 'react';
import type { Course, InteractiveLesson } from '@/types';
import { createServerClient } from './pocketbase-server';
import { requireInteractiveClass, requireInteractiveCourse, requireInteractiveLesson } from './interactive-class-access';

export const getInteractiveCourse = cache(async (courseId: string) => {
  const pb = await createServerClient();
  return requireInteractiveCourse(pb, courseId);
});

export async function getInteractiveCourses() {
  const pb = await createServerClient();
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user) throw new Error('Iniciá sesión para ver tus clases interactivas.');
  return pb.collection('courses').getFullList<Course>({
    filter: pb.filter('interactiveClassesEnabled = true && teachers.id ?= {:user}', { user: user.id }),
    sort: 'title', fields: 'id,title,teachers,interactiveClassesEnabled',
  });
}

export async function getInteractiveLessons({ courseId, classId, page = 1 }: { courseId?: string; classId?: string; page?: number } = {}) {
  const pb = await createServerClient();
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user) throw new Error('Iniciá sesión para ver tus clases interactivas.');
  if (courseId) await requireInteractiveCourse(pb, courseId);
  if (classId) {
    if (!courseId) throw new Error('Falta el curso de la clase.');
    await requireInteractiveClass(pb, courseId, classId);
  }
  const filter = pb.filter('course.interactiveClassesEnabled = true && course.teachers.id ?= {:user}', { user: user.id })
    + (courseId ? pb.filter(' && course = {:course}', { course: courseId }) : '')
    + (classId ? pb.filter(' && class = {:class}', { class: classId }) : '');
  return pb.collection('interactive_lessons').getList<InteractiveLesson>(Number.isSafeInteger(page) && page > 0 ? page : 1, 20, {
    filter, sort: '-updated,id', expand: 'course,class',
    fields: 'id,course,class,title,description,status,material,updated,expand.course.id,expand.course.title,expand.class.id,expand.class.title',
  });
}

export async function getInteractiveLesson(courseId: string, lessonId: string) {
  const pb = await createServerClient();
  await requireInteractiveCourse(pb, courseId);
  return requireInteractiveLesson(pb, courseId, lessonId);
}
