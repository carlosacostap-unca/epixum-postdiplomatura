'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { createServerClient } from './pocketbase-server';
import { ReviewError } from './review-appointments';
import { createReview, updateReview, saveReviewBlock, removeReviewBlock, reserveReviewSlot, cancelReviewBooking, evaluateReviewBooking } from './review-appointments-service';

async function execute(course: string, operation: (pb: Awaited<ReturnType<typeof createServerClient>>) => Promise<string | void>) {
  try {
    const id = await operation(await createServerClient());
    revalidatePath(`/docentes/cursos/${course}/revisiones`, 'layout');
    revalidatePath(`/estudiantes/cursos/${course}/revisiones`, 'layout');
    return { success: true as const, id };
  } catch (error) {
    const message = error instanceof ReviewError ? error.message : error instanceof ZodError ? error.issues[0]?.message : null;
    return { success: false as const, error: message || 'No pudimos completar la operación. Revisá tu acceso y actualizá la página.' };
  }
}
export async function saveReviewAction(course: string, id: string | null, revision: string, input: unknown) {
  return execute(course, async pb => {
    if (id) { await updateReview(pb, course, id, revision, input); return id; }
    return (await createReview(pb, course, input)).id;
  });
}
export async function saveReviewBlockAction(course: string, review: string, revision: string, block: string | null, input: unknown) {
  return execute(course, pb => saveReviewBlock(pb, course, review, revision, block, input));
}
export async function removeReviewBlockAction(course: string, review: string, revision: string, block: string) {
  return execute(course, pb => removeReviewBlock(pb, course, review, revision, block));
}
export async function reserveReviewAction(course: string, review: string, slot: string) {
  return execute(course, pb => reserveReviewSlot(pb, course, review, slot));
}
export async function cancelReviewAction(course: string, review: string, booking: string, mode: 'teacher' | 'student') {
  return execute(course, pb => cancelReviewBooking(pb, course, review, booking, mode === 'teacher' ? 'teacher' : 'student'));
}
export async function evaluateReviewAction(course: string, review: string, booking: string, input: unknown) {
  return execute(course, pb => evaluateReviewBooking(pb, course, review, booking, input));
}
