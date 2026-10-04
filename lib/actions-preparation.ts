'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { practiceQuizSchema } from './preparation';
import { PreparationError, requirePreparationCourse, startPractice, finishPractice } from './preparation-service';

function message(error: unknown) {
  if (error instanceof PreparationError) return error.message;
  if (error instanceof ZodError) return error.issues[0]?.message || 'Revisá las preguntas y respuestas.';
  return 'No pudimos completar la operación. Revisá tu acceso e intentá nuevamente.';
}
function refresh(course: string) {
  revalidatePath(`/docentes/cursos/${course}/preparacion`, 'layout');
  revalidatePath(`/estudiantes/cursos/${course}/preparacion`, 'layout');
}
export async function savePracticeQuiz(courseId: string, quizId: string | null, input: unknown) {
  try {
    const pb = await createServerClient();
    await requirePreparationCourse(pb, courseId, 'teacher');
    const data = practiceQuizSchema.parse(input);
    if (quizId) {
      const previous = await pb.collection('practice_quizzes').getOne(quizId);
      if (previous.course !== courseId) throw new PreparationError('El cuestionario no pertenece al curso.');
    }
    const quiz = quizId ? await pb.collection('practice_quizzes').update(quizId, data) : await pb.collection('practice_quizzes').create({ ...data, course: courseId });
    refresh(courseId); return { success: true as const, id: quiz.id };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function beginPractice(courseId: string, quizId: string) {
  try {
    const pb = await createServerClient();
    await requirePreparationCourse(pb, courseId, 'student');
    const id = await startPractice(pb, await createServiceClient(), courseId, quizId);
    refresh(courseId); return { success: true as const, id };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function submitPractice(courseId: string, attemptId: string, answers: unknown) {
  try {
    const pb = await createServerClient();
    await requirePreparationCourse(pb, courseId, 'student');
    const result = await finishPractice(pb, await createServiceClient(), courseId, attemptId, answers);
    refresh(courseId); return { success: true as const, result };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
