'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { PreparationError, requirePreparationCourse, reportPracticeCamera, startPractice } from './preparation-service';
import { storeExamPhoto } from './exam-photo-storage';
import { EXAM_PHOTO_MAX_BYTES } from './exam-photo-crypto';

function message(error: unknown) {
  return error instanceof PreparationError ? error.message : 'No pudimos verificar la cámara o guardar la foto. Intentá nuevamente.';
}

export async function beginExamWithPhoto(courseId: string, quizId: string, form: FormData) {
  try {
    const pb = await createServerClient();
    await requirePreparationCourse(pb, courseId, 'student');
    const id = await startPractice(pb, await createServiceClient(), courseId, quizId, false, async () => {
      const photo = form.get('photo');
      if (!photo || typeof photo === 'string' || photo.type !== 'image/jpeg' || photo.size < 100 || photo.size > EXAM_PHOTO_MAX_BYTES) throw new PreparationError('Necesitás una foto inicial de la cámara, en JPEG y de hasta 300 KB.');
      return storeExamPhoto(courseId, pb.authStore.record!.id, new Uint8Array(await photo.arrayBuffer()));
    });
    revalidatePath(`/estudiantes/cursos/${courseId}/preparacion`, 'layout');
    return { success: true as const, id };
  } catch (error) { return { success: false as const, error: message(error) }; }
}

export async function reportExamCamera(courseId: string, attemptId: string, active: boolean) {
  try {
    if (typeof active !== 'boolean') throw new PreparationError('Estado de cámara inválido.');
    const pb = await createServerClient();
    const state = await reportPracticeCamera(pb, await createServiceClient(), courseId, attemptId, active);
    return { success: true as const, ...state };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
