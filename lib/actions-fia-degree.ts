'use server';

import { revalidatePath } from 'next/cache';
import { fiaCourseId, isFiaDegree } from './fia-degree';
import { getFiaEnrollment } from './fia-degree-data';
import { getCurrentUser } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';

export async function saveFiaDegree(_previous: { message: string; ok: boolean }, form: FormData) {
  const degree = form.get('degree');
  if (!isFiaDegree(degree)) return { message: 'Elegí una carrera o ambas.', ok: false };
  const user = await getCurrentUser();
  if (!user) return { message: 'Iniciá sesión para guardar tu carrera.', ok: false };
  try {
    const service = await createServiceClient();
    const enrollment = await getFiaEnrollment(service, user.id);
    await service.collection('course_enrollments').update(enrollment.id, { fiaDegree: degree });
    revalidatePath(`/estudiantes/cursos/${fiaCourseId}`);
    revalidatePath(`/docentes/cursos/${fiaCourseId}/estudiantes`);
    return { message: 'Carrera guardada.', ok: true };
  } catch {
    return { message: 'No pudimos guardar tu carrera. Volvé a intentarlo desde el curso.', ok: false };
  }
}
