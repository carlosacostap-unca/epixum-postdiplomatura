'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { assignmentAIConfigInputSchema, type AssignmentAIConfigInput } from './ai-preevaluation-schema';
import { createServerClient } from './pocketbase-server';
import { teacherCanManageCourse } from './teacher-scope';
import type { AssignmentAIConfig, Course } from '@/types';
import { assignmentAIConfigDTO, type AssignmentAIConfigDTO } from './assignment-ai-config';

async function authorizedAssignmentContext(assignmentId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;
  if (!user || (user.role !== 'docente' && user.role !== 'admin')) throw new Error('No autorizado');
  const assignment = await pb.collection('assignments').getOne(assignmentId, { fields: 'id,course' });
  if (!assignment.course) throw new Error('El trabajo no pertenece a un curso');
  const course = await pb.collection('courses').getOne<Course>(assignment.course, { fields: 'id,teachers,aiPreevaluationEnabled' });
  if (!teacherCanManageCourse(course, { id: user.id, role: user.role })) throw new Error('No autorizado para este curso');
  return { pb, user, assignment, course };
}

export async function getAssignmentAIConfig(assignmentId: string): Promise<AssignmentAIConfigDTO | null> {
  const { pb } = await authorizedAssignmentContext(assignmentId);
  try {
    const record = await pb.collection('assignment_ai_configs').getFirstListItem<AssignmentAIConfig>(
      pb.filter('assignment = {:assignmentId}', { assignmentId }),
    );
    return assignmentAIConfigDTO(record);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}

export async function saveAssignmentAIConfig(assignmentId: string, input: AssignmentAIConfigInput) {
  try {
    const context = await authorizedAssignmentContext(assignmentId);
    if (!context.course.aiPreevaluationEnabled) {
      return { success: false as const, error: 'El administrador deshabilitó la preevaluación con IA para este curso.' };
    }
    const parsed = assignmentAIConfigInputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || 'La configuración no es válida.' };

    let existing: AssignmentAIConfig | null = null;
    try {
      existing = await context.pb.collection('assignment_ai_configs').getFirstListItem<AssignmentAIConfig>(
        context.pb.filter('assignment = {:assignmentId}', { assignmentId }),
      );
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
    }
    const version = existing ? Math.max(1, Number(existing.version || 1)) + 1 : 1;
    const data = { assignment: assignmentId, ...parsed.data, version };
    const record = existing
      ? await context.pb.collection('assignment_ai_configs').update<AssignmentAIConfig>(existing.id, data)
      : await context.pb.collection('assignment_ai_configs').create<AssignmentAIConfig>(data);
    revalidatePath(`/docentes/cursos/${context.course.id}/tps/${assignmentId}`);
    return { success: true as const, config: assignmentAIConfigDTO(record) };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('No autorizado')) return { success: false as const, error: message };
    return { success: false as const, error: 'No se pudo guardar la configuración de preevaluación.' };
  }
}
