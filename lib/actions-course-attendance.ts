'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { AttendanceAccessError, readAttendanceReport, requireAttendanceManager } from './course-attendance-service';

const idSchema = z.string().regex(/^[a-z0-9]{15}$/);
const correctionSchema = z.object({ classId: idSchema, studentId: idSchema, status: z.enum(['present', 'absent']) }).strict();
export type AttendanceActionResult = { success: true } | { success: false; error: string };
function refresh(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}/asistencia`);
  revalidatePath(`/docentes/cursos/${courseId}/asistencia`);
}
function failure(error: unknown): AttendanceActionResult {
  return { success: false, error: error instanceof AttendanceAccessError ? error.message : 'No pudimos guardar el cambio. Actualizá la planilla e intentá nuevamente.' };
}

export async function setCourseAttendance(courseId: string, enabled: boolean): Promise<AttendanceActionResult> {
  try {
    idSchema.parse(courseId); z.boolean().parse(enabled);
    const pb = await createServerClient();
    await requireAttendanceManager(pb, courseId);
    const service = await createServiceClient();
    await service.collection('courses').update(courseId, { attendanceEnabled: enabled });
    refresh(courseId);
    return { success: true };
  } catch (error) { return failure(error); }
}

export async function correctCourseAttendance(courseId: string, input: unknown): Promise<AttendanceActionResult> {
  try {
    idSchema.parse(courseId);
    const { classId, studentId, status } = correctionSchema.parse(input);
    const pb = await createServerClient();
    const { user } = await requireAttendanceManager(pb, courseId);
    const service = await createServiceClient();
    const report = await readAttendanceReport(service, courseId);
    const cell = report.rows.find(row => row.student.id === studentId)?.cells[classId];
    if (!cell?.editable) throw new AttendanceAccessError('Solo podés corregir alumnos de una clase con seguimiento iniciado y aplicable a su matrícula.');
    await service.collection('course_attendance_adjustments').create({ course: courseId, class: classId, student: studentId, status,
      actor: user.id, actorName: (user.name || user.email || 'Administrador').slice(0, 300) });
    refresh(courseId);
    return { success: true };
  } catch (error) { return failure(error); }
}
