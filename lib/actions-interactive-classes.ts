'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from './pocketbase-server';
import { requireInteractiveClass, requireInteractiveCourse, requireInteractiveLesson } from './interactive-class-access';
import { parseInteractiveLessonForm, separateTeacherNotes } from './interactive-material';
import { getErrorMessage } from './errors';

export type InteractiveLessonResult = { success: true; lessonId?: string } | { success: false; error: string };

function refresh(courseId: string) {
  revalidatePath('/docentes/interactivas');
  revalidatePath(`/docentes/cursos/${courseId}`, 'layout');
}

export async function saveInteractiveLesson(courseId: string, lessonId: string | null, form: FormData): Promise<InteractiveLessonResult> {
  try {
    const pb = await createServerClient();
    await requireInteractiveCourse(pb, courseId);
    if (lessonId) await requireInteractiveLesson(pb, courseId, lessonId);
    const parsed = parseInteractiveLessonForm(form);
    const data = { ...parsed, ...separateTeacherNotes(parsed.material) };
    await requireInteractiveClass(pb, courseId, data.class);
    const record = lessonId
      ? await pb.collection('interactive_lessons').update(lessonId, data)
      : await pb.collection('interactive_lessons').create({ ...data, course: courseId });
    refresh(courseId);
    return { success: true, lessonId: record.id };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, 'No pudimos guardar la clase interactiva.') };
  }
}

export async function deleteInteractiveLesson(courseId: string, lessonId: string): Promise<InteractiveLessonResult> {
  try {
    const pb = await createServerClient();
    await requireInteractiveCourse(pb, courseId);
    await requireInteractiveLesson(pb, courseId, lessonId);
    await pb.collection('interactive_lessons').delete(lessonId);
    refresh(courseId);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, 'No pudimos eliminar la clase interactiva.') };
  }
}
