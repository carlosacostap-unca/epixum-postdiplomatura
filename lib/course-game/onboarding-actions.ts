'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { authorizeCourseGame } from './service';
import { advanceGameTour, saveGameIdentity, updateGameIdentity } from './onboarding-service';
import { enrollmentCharacterSchema, type WelcomeResult } from './onboarding';

const failure = (): WelcomeResult => ({ success: false, error: 'No pudimos guardar tu avance. Revisá la conexión e intentá nuevamente.' });
async function clients(courseId: string) {
  const pb = await createServerClient();
  if (!await authorizeCourseGame(pb, courseId)) throw new Error('Acceso no autorizado');
  return { pb, service: await createServiceClient() };
}
export async function saveGameIdentityAction(courseId: string, input: unknown): Promise<WelcomeResult> {
  const parsed = enrollmentCharacterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    const { pb, service } = await clients(courseId);
    const progress = await saveGameIdentity(pb, service, courseId, parsed.data);
    revalidatePath('/profile');
    revalidatePath(`/estudiantes/cursos/${courseId}/aventura`);
    return { success: true, progress };
  } catch { return failure(); }
}
export async function updateGameIdentityAction(courseId: string, input: unknown): Promise<WelcomeResult> {
  const parsed = enrollmentCharacterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    const { pb, service } = await clients(courseId);
    const progress = await updateGameIdentity(pb, service, courseId, parsed.data);
    revalidatePath('/profile');
    revalidatePath(`/estudiantes/cursos/${courseId}/aventura`);
    return { success: true, progress };
  } catch { return failure(); }
}

export async function advanceGameTourAction(courseId: string, step: number): Promise<WelcomeResult> {
  try {
    const { pb, service } = await clients(courseId);
    const progress = await advanceGameTour(pb, service, courseId, step);
    revalidatePath(`/estudiantes/cursos/${courseId}/aventura`);
    return { success: true, progress };
  } catch { return failure(); }
}
