import type PocketBase from 'pocketbase';
import type { Class, Course, InteractiveLesson } from '@/types';
import { mergeTeacherNotes } from './interactive-material';

export async function requireInteractiveCourse(pb: PocketBase, courseId: string) {
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user) throw new Error('Iniciá sesión para gestionar clases interactivas.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (!course.interactiveClassesEnabled || !course.teachers?.includes(user.id)) {
    throw new Error('No tenés acceso a las clases interactivas de este curso.');
  }
  return course;
}

export async function requireInteractiveLesson(pb: PocketBase, courseId: string, lessonId: string) {
  const lesson = await pb.collection('interactive_lessons').getOne<InteractiveLesson>(lessonId);
  if (lesson.course !== courseId) throw new Error('La clase interactiva no pertenece a este curso.');
  if (lesson.teacherNotes) lesson.material = mergeTeacherNotes(lesson.material, lesson.teacherNotes);
  return lesson;
}

export async function requireInteractiveClass(pb: PocketBase, courseId: string, classId: string) {
  if (!classId) return;
  const record = await pb.collection('classes').getOne<Class>(classId);
  if (record.course !== courseId) throw new Error('La clase habitual debe pertenecer al mismo curso.');
}
