'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { commandCourseSurvey, requireSurveyAccess, saveCourseSurvey, submitCourseSurvey } from './course-survey-service';
import { SurveyError } from './course-surveys';

type Result = { success: true; id?: string } | { success: false; error: string };
const idSchema = z.string().regex(/^[a-z0-9]{15}$/);
const commandSchema = z.enum(['publish', 'close', 'duplicate', 'delete']);
function refresh(course: string) {
  for (const base of [`/docentes/cursos/${course}`, `/estudiantes/cursos/${course}`, `/admin/courses/${course}`]) revalidatePath(base, 'layout');
}
function failed(error: unknown): Result {
  return { success: false, error: error instanceof SurveyError ? error.message : 'No pudimos guardar los cambios. Revisá tu acceso al curso e intentá nuevamente.' };
}

export async function saveSurvey(courseId: string, surveyId: string | null, revision: string, input: unknown): Promise<Result> {
  if (!idSchema.safeParse(courseId).success || (surveyId !== null && !idSchema.safeParse(surveyId).success) || typeof revision !== 'string') return failed(null);
  try {
    const pb = await createServerClient();
    await requireSurveyAccess(pb, courseId, 'manager');
    const service = await createServiceClient();
    const id = await saveCourseSurvey(pb, service, courseId, surveyId, revision, input);
    refresh(courseId);
    return { success: true, id };
  } catch (error) { return failed(error); }
}

export async function manageSurvey(courseId: string, surveyId: string, command: unknown, revision: string): Promise<Result> {
  const parsed = commandSchema.safeParse(command);
  if (!idSchema.safeParse(courseId).success || !idSchema.safeParse(surveyId).success || !parsed.success || typeof revision !== 'string') return failed(null);
  try {
    const pb = await createServerClient();
    await requireSurveyAccess(pb, courseId, 'manager');
    const service = await createServiceClient();
    const id = await commandCourseSurvey(pb, service, courseId, surveyId, parsed.data, revision);
    refresh(courseId);
    return { success: true, id };
  } catch (error) { return failed(error); }
}

export async function respondSurvey(courseId: string, surveyId: string, input: unknown): Promise<Result> {
  if (!idSchema.safeParse(courseId).success || !idSchema.safeParse(surveyId).success) return failed(null);
  try {
    const pb = await createServerClient();
    await requireSurveyAccess(pb, courseId, 'student');
    const service = await createServiceClient();
    await submitCourseSurvey(pb, service, courseId, surveyId, input);
    refresh(courseId);
    return { success: true };
  } catch (error) { return failed(error); }
}
