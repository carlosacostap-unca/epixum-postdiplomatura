'use server';

import { revalidatePath } from 'next/cache';
import type { Course, CourseWeek } from '@/types';
import { createServerClient } from './pocketbase-server';
import { teacherCanManageWeeks, validateCourseWeekInput, weekBelongsToCourse, type CourseWeekInput } from './course-weeks';

type ServerPocketBase = Awaited<ReturnType<typeof createServerClient>>;
type WeeklyContentType = 'class' | 'assignment' | 'inquiry';

const collectionByType: Record<WeeklyContentType, string> = {
  class: 'classes',
  assignment: 'assignments',
  inquiry: 'inquiries',
};

function revalidateWeeklyCourse(courseId: string) {
  revalidatePath(`/docentes/cursos/${courseId}`);
  revalidatePath(`/estudiantes/cursos/${courseId}`);
  revalidatePath('/docentes', 'layout');
  revalidatePath('/estudiantes', 'layout');
}

async function requireAssignedTeacher(pb: ServerPocketBase, courseId: string) {
  const user = pb.authStore.model;
  if (!user) throw new Error('No tienes permisos para administrar semanas');
  const course = await pb.collection('courses').getOne<Course>(courseId, {
    fields: 'id,teachers,organizationMode',
  });
  if (!teacherCanManageWeeks(course, { id: user.id, role: user.role })) {
    throw new Error('No tienes permisos para administrar semanas de este curso');
  }
  return course;
}

function normalizeDate(value: FormDataEntryValue | null, endOfDay = false) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T${endOfDay ? '23:59:59' : '12:00:00'}.000Z`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

function weekInput(formData: FormData): CourseWeekInput {
  const status = formData.get('status');
  const normalizedStatus: CourseWeekInput['status'] = status === 'publicada' || status === 'programada' ? status : 'borrador';
  return {
    number: String(formData.get('number') || ''),
    title: String(formData.get('title') || ''),
    startDate: normalizeDate(formData.get('startDate')),
    endDate: normalizeDate(formData.get('endDate'), true),
    status: normalizedStatus,
    publishAt: normalizeDate(formData.get('publishAt')),
  };
}

async function courseWeeks(pb: ServerPocketBase, courseId: string) {
  return pb.collection('course_weeks').getFullList<CourseWeek>({
    filter: pb.filter('course = {:courseId}', { courseId }),
    fields: 'id,number',
  });
}

export async function createCourseWeek(courseId: string, formData: FormData) {
  const pb = await createServerClient();
  try {
    await requireAssignedTeacher(pb, courseId);
    const validation = validateCourseWeekInput(weekInput(formData), await courseWeeks(pb, courseId));
    if (!validation.valid) return { success: false as const, errors: validation.errors };
    const week = await pb.collection('course_weeks').create<CourseWeek>({ course: courseId, ...validation.data });
    revalidateWeeklyCourse(courseId);
    return { success: true as const, weekId: week.id };
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? error.status : undefined;
    if (status === 400) return { success: false as const, errors: { number: 'Ya existe una semana con ese número o los datos no son válidos.' } };
    return { success: false as const, error: error instanceof Error ? error.message : 'No se pudo crear la semana' };
  }
}

export async function updateCourseWeek(weekId: string, formData: FormData) {
  const pb = await createServerClient();
  try {
    const current = await pb.collection('course_weeks').getOne<CourseWeek>(weekId, { fields: 'id,course,number' });
    await requireAssignedTeacher(pb, current.course);
    const validation = validateCourseWeekInput(weekInput(formData), await courseWeeks(pb, current.course), weekId);
    if (!validation.valid) return { success: false as const, errors: validation.errors };
    await pb.collection('course_weeks').update(weekId, validation.data);
    revalidateWeeklyCourse(current.course);
    return { success: true as const, weekId };
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? error.status : undefined;
    if (status === 400) return { success: false as const, errors: { number: 'Ya existe una semana con ese número o los datos no son válidos.' } };
    return { success: false as const, error: error instanceof Error ? error.message : 'No se pudo actualizar la semana' };
  }
}

export async function deleteCourseWeek(weekId: string) {
  const pb = await createServerClient();
  try {
    const week = await pb.collection('course_weeks').getOne<CourseWeek>(weekId, { fields: 'id,course' });
    await requireAssignedTeacher(pb, week.course);
    for (const collectionName of Object.values(collectionByType)) {
      const records = await pb.collection(collectionName).getFullList<{ id: string }>({
        filter: pb.filter('week = {:weekId}', { weekId }),
        fields: 'id',
      });
      for (const record of records) await pb.collection(collectionName).update(record.id, { week: null });
    }
    await pb.collection('course_weeks').delete(weekId);
    revalidateWeeklyCourse(week.course);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'No se pudo eliminar la semana' };
  }
}

export async function assignContentToWeek(
  courseId: string,
  contentType: WeeklyContentType,
  contentId: string,
  weekId?: string,
) {
  const pb = await createServerClient();
  try {
    await requireAssignedTeacher(pb, courseId);
    const collectionName = collectionByType[contentType];
    const content = await pb.collection(collectionName).getOne<{ id: string; course?: string }>(contentId, { fields: 'id,course' });
    if (content.course !== courseId) throw new Error('El contenido no pertenece a este curso');
    if (weekId) {
      const week = await pb.collection('course_weeks').getOne<CourseWeek>(weekId, { fields: 'id,course' });
      if (!weekBelongsToCourse(week, courseId)) throw new Error('La semana no pertenece a este curso');
    }
    await pb.collection(collectionName).update(contentId, { week: weekId || null });
    revalidateWeeklyCourse(courseId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'No se pudo mover el contenido' };
  }
}
