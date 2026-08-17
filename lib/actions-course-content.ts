'use server';

import { revalidatePath } from 'next/cache';
import type PocketBase from 'pocketbase';
import type { CourseContent } from '@/types';
import { createServerClient } from './pocketbase-server';
import { getErrorMessage } from './errors';
import { isCompleteCourseContentOrder, normalizeCourseContentTitle, sortCourseContents } from './course-content';
import { requireEnabledTeacherCourse, requireScopedCourseContent } from './course-content-access';

export type CourseContentActionResult =
  | { success: true; contentId?: string }
  | { success: false; error: string };

function revalidateCourseContentPaths(courseId: string, contentId?: string) {
  revalidatePath(`/docentes/cursos/${courseId}`);
  revalidatePath(`/docentes/cursos/${courseId}/contenidos`);
  revalidatePath(`/estudiantes/cursos/${courseId}`);
  revalidatePath(`/estudiantes/cursos/${courseId}/contenidos`);
  if (contentId) {
    revalidatePath(`/docentes/cursos/${courseId}/contenidos/${contentId}`);
    revalidatePath(`/estudiantes/cursos/${courseId}/contenidos/${contentId}`);
  }
}

async function normalizePositions(pb: PocketBase, courseId: string) {
  const records = sortCourseContents(await pb.collection('course_contents').getFullList<CourseContent>({
    filter: pb.filter('course = {:course}', { course: courseId }),
    fields: 'id,position',
  }));
  if (records.every((record, index) => record.position === index)) return;
  for (const [position, record] of records.entries()) {
    if (record.position !== position) {
      await pb.collection('course_contents').update(record.id, { position });
    }
  }
}

export async function createCourseContent(courseId: string, formData: FormData): Promise<CourseContentActionResult> {
  try {
    const pb = await createServerClient();
    const user = pb.authStore.model;
    await requireEnabledTeacherCourse(pb, user, courseId);
    const title = normalizeCourseContentTitle(formData.get('title'));
    const description = String(formData.get('description') || '');
    const records = await pb.collection('course_contents').getFullList<CourseContent>({
      filter: pb.filter('course = {:course}', { course: courseId }),
      fields: 'id,position',
    });
    const position = records.reduce((maximum, record) => Math.max(maximum, Number(record.position) || 0), -1) + 1;
    const content = await pb.collection('course_contents').create<CourseContent>({ course: courseId, title, description, position });
    revalidateCourseContentPaths(courseId, content.id);
    return { success: true, contentId: content.id };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, 'No pudimos crear el contenido') };
  }
}

export async function updateCourseContent(courseId: string, contentId: string, formData: FormData): Promise<CourseContentActionResult> {
  try {
    const pb = await createServerClient();
    const user = pb.authStore.model;
    await requireEnabledTeacherCourse(pb, user, courseId);
    await requireScopedCourseContent(pb, courseId, contentId);
    const title = normalizeCourseContentTitle(formData.get('title'));
    const description = String(formData.get('description') || '');
    await pb.collection('course_contents').update(contentId, { title, description });
    revalidateCourseContentPaths(courseId, contentId);
    return { success: true, contentId };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, 'No pudimos actualizar el contenido') };
  }
}

export async function deleteCourseContent(courseId: string, contentId: string): Promise<CourseContentActionResult> {
  try {
    const pb = await createServerClient();
    const user = pb.authStore.model;
    await requireEnabledTeacherCourse(pb, user, courseId);
    await requireScopedCourseContent(pb, courseId, contentId);
    await pb.collection('course_contents').delete(contentId);
    await normalizePositions(pb, courseId);
    revalidateCourseContentPaths(courseId);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, 'No pudimos eliminar el contenido') };
  }
}

export async function reorderCourseContents(courseId: string, orderedIds: string[]): Promise<CourseContentActionResult> {
  try {
    const pb = await createServerClient();
    const user = pb.authStore.model;
    await requireEnabledTeacherCourse(pb, user, courseId);
    const current = await pb.collection('course_contents').getFullList<CourseContent>({
      filter: pb.filter('course = {:course}', { course: courseId }),
      fields: 'id,position',
    });
    if (!isCompleteCourseContentOrder(current.map((record) => record.id), orderedIds)) {
      throw new Error('El orden enviado no coincide con los contenidos actuales del curso');
    }
    const originalPositions = new Map(current.map((record) => [record.id, record.position]));
    const applied: string[] = [];
    try {
      for (const [position, id] of orderedIds.entries()) {
        if (originalPositions.get(id) === position) continue;
        await pb.collection('course_contents').update(id, { position });
        applied.push(id);
      }
    } catch (error) {
      for (const id of applied.reverse()) {
        try {
          await pb.collection('course_contents').update(id, { position: originalPositions.get(id) });
        } catch {
          // Se conserva el error original; la siguiente carga vuelve a ordenar por posición e id.
        }
      }
      throw error;
    }
    revalidateCourseContentPaths(courseId);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, 'No pudimos reordenar los contenidos') };
  }
}
