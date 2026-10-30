'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { changeCourseOutcome, requireOutcomeCourse } from './course-outcome-service';
import { OutcomeError } from './course-outcomes';

const id = z.string().regex(/^[a-z0-9]{15}$/);
const request = z.object({ courseId: id, studentId: id, revision: z.string().max(64), command: z.enum(['save', 'publish', 'withdraw']) });
type Result = { success: true } | { success: false; error: string };
export async function manageCourseOutcome(courseId: string, studentId: string, revision: string, command: unknown, input?: unknown): Promise<Result> {
  const parsed = request.safeParse({ courseId, studentId, revision, command });
  if (!parsed.success) return { success: false, error: 'La solicitud de resultado no es válida.' };
  try {
    const pb = await createServerClient();
    await requireOutcomeCourse(pb, courseId);
    await changeCourseOutcome(pb, await createServiceClient(), courseId, studentId, revision, parsed.data.command, input);
    for (const base of [`/admin/courses/${courseId}`, `/docentes/cursos/${courseId}`, `/estudiantes/cursos/${courseId}`]) revalidatePath(base, 'layout');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof OutcomeError ? error.message : 'No pudimos confirmar el cambio. Revisá tu acceso y actualizá la página.' };
  }
}
