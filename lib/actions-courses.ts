'use server';

import { createServerClient } from './pocketbase-server';
import { revalidatePath } from 'next/cache';
import { Course } from '@/types';
import { hashEnrollmentKey, validateEnrollmentKey } from './course-enrollment-key';
import { validateInvitationPassword } from './course-invitations';
import { hashInvitationPassword } from './course-invitation-password';
import { createServiceClient } from './pocketbase-service';
import { getErrorMessage } from './errors';

export type UpdateCourseResult =
  | { success: true; courseId: string }
  | { success: false; error: string };

function requireAdmin(pb: Awaited<ReturnType<typeof createServerClient>>) {
  const user = pb.authStore.model;
  if (!user || user.role !== 'admin') throw new Error('No tienes permisos para administrar cursos');
}

function parseOrganizationMode(value: FormDataEntryValue | null) {
  return value === 'semanal' ? 'semanal' as const : 'tradicional' as const;
}

function parseEnrollmentMode(value: FormDataEntryValue | null) {
  return value === 'invitacion_contrasena' ? 'invitacion_contrasena' as const : 'clave' as const;
}

function parseContentsEnabled(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'on';
}

function parseAIPreevaluationEnabled(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'on';
}

function revalidateCourseSurfaces(courseId?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/courses');
  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/docentes', 'layout');
  revalidatePath('/estudiantes', 'layout');
}

export async function createCourse(formData: FormData) {
  const pb = await createServerClient();
  requireAdmin(pb);
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  let startDate = formData.get('startDate') as string;
  let endDate = formData.get('endDate') as string;
  const status = formData.get('status') as 'borrador' | 'en curso' | 'finalizado';
  const organizationMode = parseOrganizationMode(formData.get('organizationMode'));
  const enrollmentMode = parseEnrollmentMode(formData.get('enrollmentMode'));
  const contentsEnabled = parseContentsEnabled(formData.get('contentsEnabled'));
  const aiPreevaluationEnabled = parseAIPreevaluationEnabled(formData.get('aiPreevaluationEnabled'));
  
  if (startDate && !startDate.includes('T')) {
    startDate = `${startDate}T12:00:00.000Z`;
  }
  
  if (endDate && !endDate.includes('T')) {
    endDate = `${endDate}T12:00:00.000Z`;
  }

  const enrollmentKey = (formData.get('enrollmentKey') as string | null)?.trim() || '';
  const invitationPassword = (formData.get('invitationPassword') as string | null) || '';
  const teachers = formData.getAll('teachers') as string[];
  const classes = formData.getAll('classes') as string[];
  const assignments = formData.getAll('assignments') as string[];
  const inquiries = formData.getAll('inquiries') as string[];

  const data = {
    title,
    description,
    startDate,
    endDate,
    status: status || 'borrador',
    organizationMode,
    enrollmentMode,
    contentsEnabled,
    aiPreevaluationEnabled,
    teachers,
    classes,
    assignments,
    inquiries,
  };

  const credentials: { enrollmentKeyHash?: string; invitationPasswordHash?: string } = {};
  if (enrollmentKey) {
    const validation = validateEnrollmentKey(enrollmentKey);
    if (!validation.valid) throw new Error(validation.error);
    credentials.enrollmentKeyHash = hashEnrollmentKey(validation.normalized);
  }
  if (invitationPassword) {
    const validation = validateInvitationPassword(invitationPassword);
    if (!validation.valid) throw new Error(validation.error);
    credentials.invitationPasswordHash = hashInvitationPassword(validation.password);
  }

  try {
    const record = await pb.collection('courses').create<Course>(data);
    if (Object.keys(credentials).length > 0) {
      const servicePb = await createServiceClient();
      await servicePb.collection('courses').update(record.id, credentials);
    }
    revalidateCourseSurfaces(record.id);
    return record;
  } catch (error) {
    console.error('Error creating course:', error);
    throw new Error('No pudimos crear el curso. Revisá los datos e intentá nuevamente.');
  }
}

async function updateCourseOrThrow(id: string, formData: FormData) {
  const pb = await createServerClient();
  requireAdmin(pb);
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  let startDate = formData.get('startDate') as string;
  let endDate = formData.get('endDate') as string;
  const status = formData.get('status') as 'borrador' | 'en curso' | 'finalizado';
  const organizationMode = parseOrganizationMode(formData.get('organizationMode'));
  const enrollmentMode = parseEnrollmentMode(formData.get('enrollmentMode'));
  const contentsEnabled = parseContentsEnabled(formData.get('contentsEnabled'));
  const aiPreevaluationEnabled = parseAIPreevaluationEnabled(formData.get('aiPreevaluationEnabled'));
  
  if (startDate && !startDate.includes('T')) {
    startDate = `${startDate}T12:00:00.000Z`;
  }
  
  if (endDate && !endDate.includes('T')) {
    endDate = `${endDate}T12:00:00.000Z`;
  }

  const enrollmentKey = (formData.get('enrollmentKey') as string | null)?.trim() || '';
  const invitationPassword = (formData.get('invitationPassword') as string | null) || '';
  const teachers = formData.getAll('teachers') as string[];
  const classes = formData.getAll('classes') as string[];
  const assignments = formData.getAll('assignments') as string[];
  const inquiries = formData.getAll('inquiries') as string[];

  const data = {
    title,
    description,
    startDate,
    endDate,
    status: status || 'borrador',
    organizationMode,
    enrollmentMode,
    contentsEnabled,
    aiPreevaluationEnabled,
    teachers,
    classes,
    assignments,
    inquiries,
  };

  const credentials: { enrollmentKeyHash?: string; invitationPasswordHash?: string } = {};
  if (enrollmentKey) {
    const validation = validateEnrollmentKey(enrollmentKey);
    if (!validation.valid) throw new Error(validation.error);
    credentials.enrollmentKeyHash = hashEnrollmentKey(validation.normalized);
  }
  if (invitationPassword) {
    const validation = validateInvitationPassword(invitationPassword);
    if (!validation.valid) throw new Error(validation.error);
    credentials.invitationPasswordHash = hashInvitationPassword(validation.password);
  }

  try {
    const record = await pb.collection('courses').update<Course>(id, data);
    if (Object.keys(credentials).length > 0) {
      const servicePb = await createServiceClient();
      await servicePb.collection('courses').update(id, credentials);
    }
    revalidateCourseSurfaces(id);
    return record;
  } catch (error) {
    console.error('Error updating course:', error);
    throw new Error('No pudimos actualizar el curso. Revisá los datos e intentá nuevamente.');
  }
}

export async function updateCourse(id: string, formData: FormData): Promise<UpdateCourseResult> {
  try {
    const record = await updateCourseOrThrow(id, formData);
    return { success: true, courseId: record.id };
  } catch (error) {
    const message = getErrorMessage(error, 'No pudimos actualizar el curso.');
    const safeMessage =
      message.startsWith('La clave debe') ||
      message.startsWith('La contraseña debe') ||
      message.startsWith('La contraseña no puede') ||
      message.startsWith('No tienes permisos')
        ? message
        : message.includes('COURSE_ENROLLMENT_SECRET')
          ? 'La seguridad de matrículas no está configurada en el servidor. Configurá COURSE_ENROLLMENT_SECRET con al menos 32 caracteres y volvé a desplegar.'
          : 'No pudimos actualizar el curso. Revisá los datos e intentá nuevamente.';

    return { success: false, error: safeMessage };
  }
}

export async function deleteCourse(id: string) {
  const pb = await createServerClient();
  requireAdmin(pb);
  
  try {
    await pb.collection('courses').delete(id);
    revalidateCourseSurfaces();
  } catch (error) {
    console.error('Error deleting course:', error);
    throw new Error('No pudimos eliminar el curso. Intentá nuevamente.');
  }
}
