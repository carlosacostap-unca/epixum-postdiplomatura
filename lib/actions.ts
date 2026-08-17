"use server";

import { createServerClient } from "@/lib/pocketbase-server";
import { revalidatePath } from "next/cache";
import { getPresignedUploadUrl, getPresignedDownloadUrl, configureBucketCors } from "./s3";
import { parseDeliveryFiles, type CourseWeek } from "@/types";
import { teacherCanManageCourse } from "./teacher-scope";
import { getErrorResponse } from "./errors";
import { isWeekEffectivelyVisible } from "./course-weeks";
import { getExclusiveResourceParent, resourceParentField, type ResourceParent } from "./resource-parent";

type ServerPocketBase = Awaited<ReturnType<typeof createServerClient>>;

async function canManageCourse(
  pb: ServerPocketBase,
  user: { id: string; role?: string },
  courseId?: string,
) {
  if (!courseId) return false;
  if (user.role === "admin") return true;
  if (user.role !== "docente") return false;
  try {
    const course = await pb.collection("courses").getOne(courseId, { fields: "id,teachers" });
    return teacherCanManageCourse(course, { id: user.id, role: user.role || "" });
  } catch {
    return false;
  }
}

async function studentCanAccessCourse(
  pb: ServerPocketBase,
  user: { id: string; role?: string },
  courseId?: string,
) {
  if (!courseId || user.role !== "estudiante") return false;
  try {
    await pb.collection("course_enrollments").getFirstListItem(
      pb.filter("course = {:courseId} && student = {:studentId}", { courseId, studentId: user.id }),
      { fields: "id" },
    );
    return true;
  } catch {
    return false;
  }
}

async function studentCanAccessContent(
  pb: ServerPocketBase,
  user: { id: string; role?: string },
  collection: "classes" | "assignments",
  recordId: string,
) {
  try {
    const record = await pb.collection(collection).getOne(recordId, { fields: "id,course,week" });
    if (!(await studentCanAccessCourse(pb, user, record.course))) return false;
    const course = await pb.collection("courses").getOne(record.course, { fields: "id,organizationMode" });
    if (course.organizationMode !== "semanal") return true;
    if (!record.week) return false;
    const week = await pb.collection("course_weeks").getOne<CourseWeek>(record.week, { fields: "id,course,status,publishAt" });
    return week.course === record.course && isWeekEffectivelyVisible(week);
  } catch {
    return false;
  }
}

async function classCourseId(pb: ServerPocketBase, classId: string) {
  const record = await pb.collection("classes").getOne(classId, { fields: "course" });
  return record.course as string | undefined;
}

async function assignmentCourseId(pb: ServerPocketBase, assignmentId: string) {
  const record = await pb.collection("assignments").getOne(assignmentId, { fields: "course" });
  return record.course as string | undefined;
}

async function contentCourseId(pb: ServerPocketBase, contentId: string) {
  const record = await pb.collection("course_contents").getOne(contentId, { fields: "course" });
  return record.course as string | undefined;
}

async function canManageResourceParent(pb: ServerPocketBase, user: { id: string; role?: string }, parent: ResourceParent) {
  const courseId = parent.type === 'class'
    ? await classCourseId(pb, parent.id)
    : parent.type === 'assignment'
      ? await assignmentCourseId(pb, parent.id)
      : await contentCourseId(pb, parent.id);
  if (parent.type !== 'content') return { allowed: await canManageCourse(pb, user, courseId), courseId };
  if (!courseId || user.role !== 'docente') return { allowed: false, courseId };
  try {
    const course = await pb.collection('courses').getOne(courseId, { fields: 'id,teachers,contentsEnabled' });
    return { allowed: Boolean(course.contentsEnabled && course.teachers?.includes(user.id)), courseId };
  } catch {
    return { allowed: false, courseId };
  }
}

async function studentCanAccessIndependentContent(pb: ServerPocketBase, user: { id: string; role?: string }, contentId: string) {
  try {
    const courseId = await contentCourseId(pb, contentId);
    if (!(await studentCanAccessCourse(pb, user, courseId))) return false;
    const course = await pb.collection('courses').getOne(courseId!, { fields: 'id,contentsEnabled' });
    return course.contentsEnabled === true;
  } catch {
    return false;
  }
}

async function validatedWeekId(pb: ServerPocketBase, courseId: string, value: FormDataEntryValue | null) {
  const weekId = typeof value === "string" ? value.trim() : "";
  if (!weekId) return null;
  const week = await pb.collection("course_weeks").getOne(weekId, { fields: "id,course" });
  if (week.course !== courseId) throw new Error("La semana no pertenece a este curso");
  return weekId;
}

async function linkParent(pb: ServerPocketBase, linkId: string) {
  const link = await pb.collection('links').getOne(linkId, { fields: 'class,assignment,content' });
  return getExclusiveResourceParent({ classId: link.class, assignmentId: link.assignment, contentId: link.content });
}

function getStorageKeyFromUrl(fileUrl: string) {
  let key = fileUrl;
  if (fileUrl.startsWith('http')) {
    const urlObj = new URL(fileUrl);
    key = decodeURIComponent(urlObj.pathname.split('/').pop() || '');
  }
  return key;
}

export async function ensureCorsConfigured() {
  try {
    const success = await configureBucketCors();
    return { success };
  } catch (error) {
    console.error("Failed to configure CORS:", error);
    return { success: false, error: String(error) };
  }
}

export async function getUploadUrl(filename: string, fileType: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const { url, fields } = await getPresignedUploadUrl(filename, fileType);
    return { success: true, url, fields };
  } catch (error) {
    console.error('Failed to get upload URL:', error);
    return { success: false, error: 'Failed to get upload URL' };
  }
}

export async function getResourceUploadUrl(filename: string, fileType: string, parentIds?: { classId?: string; assignmentId?: string; contentId?: string }) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const parent = getExclusiveResourceParent(parentIds || {});
    if (!parent) return { success: false, error: 'Debe indicar exactamente un contenido padre' };
    const access = await canManageResourceParent(pb, user, parent);
    if (!access.allowed) return { success: false, error: 'No tienes permisos para subir recursos en este curso' };
    const { url, fields } = await getPresignedUploadUrl(filename, fileType);
    return { success: true, url, fields };
  } catch (error) {
    console.error('Failed to get resource upload URL:', error);
    return { success: false, error: 'Failed to get resource upload URL' };
  }
}

export async function getResourceDownloadUrl(linkId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const link = await pb.collection('links').getOne(linkId);
    const parent = getExclusiveResourceParent({ classId: link.class, assignmentId: link.assignment, contentId: link.content });
    if (!parent) return { success: false, error: 'El recurso no tiene un padre válido' };
    const teacherAllowed = user.role === 'docente' && (await canManageResourceParent(pb, user, parent)).allowed;
    const adminAllowed = user.role === 'admin' && parent.type !== 'content' && (await canManageResourceParent(pb, user, parent)).allowed;
    const studentAllowed = user.role === 'estudiante' && (
      parent.type === 'class'
        ? await studentCanAccessContent(pb, user, 'classes', parent.id)
        : parent.type === 'assignment'
          ? await studentCanAccessContent(pb, user, 'assignments', parent.id)
          : await studentCanAccessIndependentContent(pb, user, parent.id)
    );
    if (!teacherAllowed && !adminAllowed && !studentAllowed) {
      return { success: false, error: 'No autorizado para este curso' };
    }

    // Extract key from url
    // Assuming url is like https://endpoint/bucket/filename.ext or just filename
    let key = link.url;
    if (link.url.startsWith('http')) {
        const urlObj = new URL(link.url);
        // Extract filename from path
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop() || '';
        // Decode URI component to handle spaces and special characters
        key = decodeURIComponent(filename);
    }

    if (!key) {
        return { success: false, error: 'Invalid file key' };
    }

    const downloadUrl = await getPresignedDownloadUrl(key);
    return { success: true, url: downloadUrl };

  } catch (error) {
    console.error('Failed to get resource download URL:', error);
    return { success: false, error: 'Failed to get resource download URL' };
  }
}

export async function getDeliveryDownloadUrl(deliveryId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const delivery = await pb.collection('deliveries').getOne(deliveryId);

    // Check permissions: Student can access their own, Teacher/Admin can access all
    if (user.role === 'estudiante') {
      const courseId = await assignmentCourseId(pb, delivery.assignment);
      if (delivery.student !== user.id || !(await studentCanAccessCourse(pb, user, courseId))) {
        return { success: false, error: 'Unauthorized access to delivery' };
      }
    }
    if (user.role === "docente") {
      const courseId = await assignmentCourseId(pb, delivery.assignment);
      if (!(await canManageCourse(pb, user, courseId))) {
        return { success: false, error: "No autorizado para este curso" };
      }
    }

    // Extract key from repositoryUrl
    // Assuming repositoryUrl is like https://endpoint/bucket/filename.zip
    const url = new URL(delivery.repositoryUrl);
    const key = url.pathname.split('/').pop();

    if (!key) {
        return { success: false, error: 'Invalid file key' };
    }

    const downloadUrl = await getPresignedDownloadUrl(key);
    return { success: true, url: downloadUrl };

  } catch (error) {
    console.error('Failed to get download URL:', error);
    return { success: false, error: 'Failed to get download URL' };
  }
}

export async function updateUserRole(userId: string, role: string) {
  const pb = await createServerClient();
  
  // Verify current user is admin
  if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') {
    throw new Error("Unauthorized");
  }

  try {
    await pb.collection('users').update(userId, { role });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Failed to update role:', error);
    return { success: false, error: 'Failed to update role' };
  }
}

// Classes

export async function createClassForCourse(courseId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  if (!(await canManageCourse(pb, user, courseId))) {
    return { success: false, error: "No tienes permisos para gestionar este curso" };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dateStr = formData.get('date') as string;
  const timeStr = formData.get('time') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
    const week = await validatedWeekId(pb, courseId, formData.get('week'));
    let dateObj = null;
    if (dateStr) {
      // Check if dateStr is already an ISO string
      if (dateStr.includes('T') && dateStr.endsWith('Z')) {
        dateObj = dateStr;
      } else {
        // Combine date and time if available
        const dateTimeStr = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
        dateObj = new Date(dateTimeStr).toISOString();
      }
    }

    // Create the class
    const data: Record<string, unknown> = {
      title,
      description,
      date: dateObj,
      course: courseId, // Relacionar directamente la clase con el curso
      week,
    };
    
    const newClass = await pb.collection('classes').create(data);
    
    revalidatePath(`/docentes/cursos/${courseId}`);
    return { success: true, classId: newClass.id };
  } catch (error) {
    console.error('Failed to create class for course:', error);
    return { success: false, error: 'Failed to create class' };
  }
}

export async function createClass(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const date = formData.get('date') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
    const data: Record<string, unknown> = {
      title,
      description,
      date: date ? new Date(date).toISOString() : null,
    };
    
    await pb.collection('classes').create(data);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to create class:', error);
    return { success: false, error: 'Failed to create class' };
  }
}

export async function updateClass(classId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  const scopedCourseId = await classCourseId(pb, classId).catch(() => undefined);
  if (!(await canManageCourse(pb, user, scopedCourseId))) {
    return { success: false, error: "No tienes permisos para gestionar esta clase" };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dateStr = formData.get('date') as string;
  const timeStr = formData.get('time') as string;

  try {
    const week = await validatedWeekId(pb, scopedCourseId!, formData.get('week'));
    let dateObj = null;
    if (dateStr) {
      if (dateStr.includes('T') && dateStr.endsWith('Z')) {
        dateObj = dateStr;
      } else {
        const dateTimeStr = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
        dateObj = new Date(dateTimeStr).toISOString();
      }
    }

    const data: Record<string, unknown> = {
      title,
      description,
      date: dateObj,
      week,
    };

    await pb.collection('classes').update(classId, data);
    
    revalidatePath('/');
    revalidatePath(`/classes/${classId}`);
    revalidatePath('/docentes', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Failed to update class:', error);
    return { success: false, error: 'Failed to update class' };
  }
}

export async function deleteClass(classId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  const scopedCourseId = await classCourseId(pb, classId).catch(() => undefined);
  if (!(await canManageCourse(pb, user, scopedCourseId))) {
    return { success: false, error: "No tienes permisos para gestionar esta clase" };
  }

  try {
    await pb.collection('classes').delete(classId);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete class:', error);
    return { success: false, error: 'Failed to delete class' };
  }
}

// Assignments

export async function createAssignmentForCourse(courseId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  if (!(await canManageCourse(pb, user, courseId))) {
    return { success: false, error: "No tienes permisos para gestionar este curso" };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDateStr = formData.get('dueDate') as string;
  const timeStr = formData.get('time') as string;
  const systemPrompt = formData.get('systemPrompt') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
    const week = await validatedWeekId(pb, courseId, formData.get('week'));
    let dateObj = null;
    if (dueDateStr) {
      if (dueDateStr.includes('T') && dueDateStr.endsWith('Z')) {
        dateObj = dueDateStr;
      } else {
        const dateTimeStr = timeStr ? `${dueDateStr}T${timeStr}` : `${dueDateStr}T23:59:59`;
        dateObj = new Date(dateTimeStr).toISOString();
      }
    }

    const data: Record<string, unknown> = {
      title,
      description,
      dueDate: dateObj,
      systemPrompt: systemPrompt || "",
      course: courseId,
      week,
    };
    
    // Create the assignment
    const newAssignment = await pb.collection('assignments').create(data);
    
    // Get the course
    const course = await pb.collection('courses').getOne(courseId);
    
    // Append the new assignment id
    const updatedAssignments = [...(course.assignments || []), newAssignment.id];
    
    // Update the course
    await pb.collection('courses').update(courseId, { assignments: updatedAssignments });
    
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/docentes/cursos/${courseId}`);
    revalidatePath(`/estudiantes/cursos/${courseId}`);
    return { success: true, assignmentId: newAssignment.id };
  } catch (error) {
    console.error('Failed to create assignment for course:', error);
    return { success: false, error: 'Failed to create assignment' };
  }
}

export async function createAssignment(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDate = formData.get('dueDate') as string;
  const systemPrompt = formData.get('systemPrompt') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
    const data: Record<string, unknown> = {
      title,
      description,
      systemPrompt: systemPrompt || "",
    };
    if (dueDate) data.dueDate = new Date(dueDate).toISOString();
    
    await pb.collection('assignments').create(data);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to create assignment:', error);
    const response = getErrorResponse(error);
    if (response) {
      console.error('PocketBase validation errors:', JSON.stringify(response, null, 2));
    }
    return { success: false, error: 'Failed to create assignment' };
  }
}

export async function updateAssignment(assignmentId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  const scopedCourseId = await assignmentCourseId(pb, assignmentId).catch(() => undefined);
  if (!(await canManageCourse(pb, user, scopedCourseId))) {
    return { success: false, error: "No tienes permisos para gestionar este trabajo" };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDate = formData.get('dueDate') as string;
  const systemPrompt = formData.get('systemPrompt') as string;
  const courseId = formData.get('courseId') as string;

  try {
    const week = await validatedWeekId(pb, scopedCourseId!, formData.get('week'));
    const data: Record<string, unknown> = {
      title,
      description,
      systemPrompt: systemPrompt || "",
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      week,
    };

    await pb.collection('assignments').update(assignmentId, data);
    
    revalidatePath('/');
    revalidatePath(`/assignments/${assignmentId}`);
    if (courseId) {
      revalidatePath(`/docentes/cursos/${courseId}`);
      revalidatePath(`/docentes/cursos/${courseId}/tps/${assignmentId}`);
      revalidatePath(`/estudiantes/cursos/${courseId}`);
      revalidatePath(`/estudiantes/cursos/${courseId}/tps/${assignmentId}`);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to update assignment:', error);
    const response = getErrorResponse(error);
    if (response) {
      console.error('PocketBase validation errors:', JSON.stringify(response, null, 2));
    }
    return { success: false, error: 'Failed to update assignment' };
  }
}

export async function updateAssignmentSystemPrompt(assignmentId: string, systemPrompt: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  const scopedCourseId = await assignmentCourseId(pb, assignmentId).catch(() => undefined);
  if (!(await canManageCourse(pb, user, scopedCourseId))) {
    return { success: false, error: "No tienes permisos para gestionar este trabajo" };
  }

  try {
    await pb.collection('assignments').update(assignmentId, {
      systemPrompt: systemPrompt || "",
    });
    
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to update system prompt:', error);
    return { success: false, error: 'Failed to update system prompt' };
  }
}

export async function deleteAssignment(assignmentId: string, courseId?: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const scopedCourseId = courseId || await assignmentCourseId(pb, assignmentId).catch(() => undefined);
  if (!(await canManageCourse(pb, user, scopedCourseId))) {
    return { success: false, error: "No tienes permisos para gestionar este trabajo" };
  }

  try {
    const targetCourseId = courseId || (await pb.collection('assignments').getOne(assignmentId)).course;
    if (targetCourseId) {
      const course = await pb.collection('courses').getOne(targetCourseId);
      const assignments = Array.isArray(course.assignments) ? course.assignments : [];
      await pb.collection('courses').update(targetCourseId, {
        assignments: assignments.filter((id: string) => id !== assignmentId),
      });
    }

    await pb.collection('assignments').delete(assignmentId);

    revalidatePath('/');
    revalidatePath('/docentes', 'layout');
    revalidatePath('/estudiantes', 'layout');
    if (targetCourseId) {
      revalidatePath(`/docentes/cursos/${targetCourseId}`);
      revalidatePath(`/estudiantes/cursos/${targetCourseId}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete assignment:', error);
    return { success: false, error: 'Failed to delete assignment' };
  }
}

// Links

export async function createLink(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const url = formData.get('url') as string;
  const type = formData.get('type') as 'link' | 'file' || 'link';
  const classId = formData.get('classId') as string;
  const assignmentId = formData.get('assignmentId') as string;
  const contentId = formData.get('contentId') as string;
  const parent = getExclusiveResourceParent({ classId, assignmentId, contentId });

  if (!title || !url || !parent) {
     return { success: false, error: 'Título, URL y exactamente un padre son obligatorios' };
  }
  const access = await canManageResourceParent(pb, user, parent).catch(() => ({ allowed: false, courseId: undefined }));
  if (!access.allowed) {
    return { success: false, error: "No tienes permisos para gestionar recursos en este curso" };
  }

  try {
    const data: Record<string, unknown> = {
      title,
      url,
      type,
    };
    data[resourceParentField(parent)] = parent.id;
    
    await pb.collection('links').create(data);
    
    if (classId) {
      revalidatePath(`/classes/${classId}`);
      revalidatePath('/docentes', 'layout'); // Revalidate all teacher routes
    }
    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    if (contentId && access.courseId) {
      revalidatePath(`/docentes/cursos/${access.courseId}/contenidos/${contentId}`);
      revalidatePath(`/estudiantes/cursos/${access.courseId}/contenidos/${contentId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to create link:', error);
    return { success: false, error: 'Failed to create link' };
  }
}

export async function updateLink(linkId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  const parent = await linkParent(pb, linkId).catch(() => null);
  if (!parent) return { success: false, error: 'El recurso no tiene un padre válido' };
  const access = await canManageResourceParent(pb, user, parent).catch(() => ({ allowed: false, courseId: undefined }));
  if (!access.allowed) {
    return { success: false, error: "No tienes permisos para gestionar este recurso" };
  }

  const title = formData.get('title') as string;
  const url = formData.get('url') as string;
  const type = formData.get('type') as 'link' | 'file';
  const classId = formData.get('classId') as string;
  const assignmentId = formData.get('assignmentId') as string;
  const contentId = formData.get('contentId') as string;

  try {
    const data: Record<string, unknown> = {
      title,
      url,
    };
    if (type) data.type = type;

    await pb.collection('links').update(linkId, data);
    
    if (classId) {
      revalidatePath(`/classes/${classId}`);
      revalidatePath('/docentes', 'layout');
    }
    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    if (contentId && access.courseId) {
      revalidatePath(`/docentes/cursos/${access.courseId}/contenidos/${contentId}`);
      revalidatePath(`/estudiantes/cursos/${access.courseId}/contenidos/${contentId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update link:', error);
    return { success: false, error: 'Failed to update link' };
  }
}

export async function deleteLink(linkId: string, parentId?: string, parentType?: 'class' | 'assignment' | 'content') {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }
  const parent = await linkParent(pb, linkId).catch(() => null);
  if (!parent) return { success: false, error: 'El recurso no tiene un padre válido' };
  const access = await canManageResourceParent(pb, user, parent).catch(() => ({ allowed: false, courseId: undefined }));
  if (!access.allowed) {
    return { success: false, error: "No tienes permisos para gestionar este recurso" };
  }

  try {
    await pb.collection('links').delete(linkId);
    
    if (parentId && parentType) {
        if (parentType === 'class') {
          revalidatePath(`/classes/${parentId}`);
          revalidatePath('/docentes', 'layout'); // Revalidate all teacher routes
        }
        if (parentType === 'assignment') revalidatePath(`/assignments/${parentId}`);
        if (parentType === 'content' && access.courseId) {
          revalidatePath(`/docentes/cursos/${access.courseId}/contenidos/${parentId}`);
          revalidatePath(`/estudiantes/cursos/${access.courseId}/contenidos/${parentId}`);
        }
    }
    // Si no se pasaron parentId/parentType pero igual queremos asegurar que se actualice la UI docente
    revalidatePath('/docentes', 'layout');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete link:', error);
    return { success: false, error: 'Failed to delete link' };
  }
}

// Deliveries

export async function createDelivery(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'Unauthorized: Only students can submit' };
  }

  const assignmentId = (formData.get('assignmentId') as string)?.trim();
  const repositoryUrl = (formData.get('repositoryUrl') as string)?.trim();

  if (!assignmentId || !repositoryUrl) {
     return { success: false, error: 'Assignment ID and Repository URL are required' };
  }

  try {
    // Check deadline
    const assignment = await pb.collection('assignments').getOne(assignmentId);
    if (!(await studentCanAccessContent(pb, user, "assignments", assignmentId))) {
      return { success: false, error: "No estás matriculado en este curso" };
    }
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
        return { success: false, error: 'El plazo de entrega ha finalizado' };
    }

    const data: Record<string, unknown> = {
      assignment: assignmentId,
      student: user.id,
      repositoryUrl,
    };
    
    await pb.collection('deliveries').create(data);
    
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to create delivery:', error);
    // Check for unique constraint violation
    if (String(error).includes('unique')) {
        return { success: false, error: 'You have already submitted for this assignment' };
    }
    return { success: false, error: 'Failed to create delivery' };
  }
}

export async function createDeliveryWithFiles(assignmentId: string, courseId: string, files: { name: string; url: string }[]) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'No autorizado: Solo estudiantes pueden entregar' };
  }

  if (!assignmentId || files.length === 0) {
    return { success: false, error: 'Se requiere el TP y al menos un archivo' };
  }

  try {
    const assignment = await pb.collection('assignments').getOne(assignmentId);
    if (assignment.course !== courseId || !(await studentCanAccessContent(pb, user, "assignments", assignmentId))) {
      return { success: false, error: "No estás matriculado en este curso" };
    }
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      return { success: false, error: 'El plazo de entrega ha finalizado' };
    }

    const repositoryUrl = JSON.stringify(files);
    await pb.collection('deliveries').create({
      assignment: assignmentId,
      student: user.id,
      repositoryUrl,
    });

    revalidatePath(`/estudiantes/cursos/${courseId}/tps/${assignmentId}`);
    revalidatePath(`/docentes/cursos/${courseId}/tps/${assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to create delivery with files:', error);
    if (String(error).includes('unique')) {
      return { success: false, error: 'Ya enviaste una entrega para este trabajo práctico' };
    }
    return { success: false, error: 'Error al guardar la entrega' };
  }
}

export async function updateDeliveryWithFiles(deliveryId: string, courseId: string, assignmentId: string, files: { name: string; url: string }[]) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'No autorizado' };
  }

  if (files.length === 0) {
    return { success: false, error: 'Debes adjuntar al menos un archivo' };
  }

  try {
    const delivery = await pb.collection('deliveries').getOne(deliveryId);
    if (delivery.student !== user.id || delivery.assignment !== assignmentId) {
      return { success: false, error: 'No autorizado' };
    }
    const assignment = await pb.collection('assignments').getOne(delivery.assignment);
    if (assignment.course !== courseId || !(await studentCanAccessContent(pb, user, "assignments", assignmentId))) {
      return { success: false, error: "No estás matriculado en este curso" };
    }
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      return { success: false, error: 'El plazo de entrega ha finalizado' };
    }

    await pb.collection('deliveries').update(deliveryId, {
      repositoryUrl: JSON.stringify(files),
    });

    revalidatePath(`/estudiantes/cursos/${courseId}/tps/${assignmentId}`);
    revalidatePath(`/docentes/cursos/${courseId}/tps/${assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update delivery with files:', error);
    return { success: false, error: 'Error al actualizar la entrega' };
  }
}

export async function getStudentDeliveryFileDownloadUrl(deliveryId: string, fileIndex: number) {
  const pb = await createServerClient();
  const user = pb.authStore.model;
  if (!user || user.role !== "estudiante") return { success: false, error: 'No autorizado' };

  try {
    const delivery = await pb.collection("deliveries").getOne(deliveryId);
    if (delivery.student !== user.id) return { success: false, error: "No autorizado" };
    if (!(await studentCanAccessContent(pb, user, "assignments", delivery.assignment))) return { success: false, error: "No autorizado para este curso" };
    const file = parseDeliveryFiles(delivery.repositoryUrl)[fileIndex];
    if (!file?.url) return { success: false, error: "Archivo de entrega inválido" };
    const key = getStorageKeyFromUrl(file.url);
    if (!key) return { success: false, error: 'Clave de archivo inválida' };
    const downloadUrl = await getPresignedDownloadUrl(key);
    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error('Failed to get file download URL:', error);
    return { success: false, error: 'Error al obtener el enlace de descarga' };
  }
}

export async function getTeacherDeliveryFileDownloadUrl(deliveryId: string, fileIndex: number) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'No autorizado' };
  }

  try {
    const delivery = await pb.collection('deliveries').getOne(deliveryId);
    const courseId = await assignmentCourseId(pb, delivery.assignment);
    if (!(await canManageCourse(pb, user, courseId))) {
      return { success: false, error: "No autorizado para este curso" };
    }
    const files = parseDeliveryFiles(delivery.repositoryUrl);
    const file = files[fileIndex];

    if (!file?.url) {
      return { success: false, error: 'Archivo de entrega inválido' };
    }

    const key = getStorageKeyFromUrl(file.url);
    if (!key) {
      return { success: false, error: 'Clave de archivo inválida' };
    }

    const downloadUrl = await getPresignedDownloadUrl(key);
    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error('Failed to get teacher delivery file download URL:', error);
    return { success: false, error: 'Error al obtener el enlace de descarga' };
  }
}

export async function updateDelivery(deliveryId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // We need to fetch the delivery to check ownership, 
  // although PocketBase API rules should handle this, it's good to be explicit or just try/catch
  
  const repositoryUrl = (formData.get('repositoryUrl') as string)?.trim();
  const assignmentId = (formData.get('assignmentId') as string)?.trim(); // Needed for revalidation

  if (!repositoryUrl) {
     return { success: false, error: 'Repository URL is required' };
  }

  try {
    // Check deadline
    const currentDelivery = await pb.collection('deliveries').getOne(deliveryId);
    const assignment = await pb.collection('assignments').getOne(currentDelivery.assignment);
    if (user.role !== "estudiante" || currentDelivery.student !== user.id || !(await studentCanAccessContent(pb, user, "assignments", currentDelivery.assignment))) {
      return { success: false, error: "No autorizado" };
    }
    
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
        return { success: false, error: 'El plazo de entrega ha finalizado' };
    }

    const data = {
      repositoryUrl,
    };

    await pb.collection('deliveries').update(deliveryId, data);
    
    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update delivery:', error);
    return { success: false, error: 'Failed to update delivery' };
  }
}

export async function updateDeliveryEvaluation(deliveryId: string, grade: number, feedback: string, verdict: 'Aprobado' | 'Corregir y reenviar' | undefined, status: 'draft' | 'published') {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!deliveryId || deliveryId.length !== 15) {
    return { success: false, error: 'Invalid delivery ID' };
  }

  try {
    const delivery = await pb.collection('deliveries').getOne(deliveryId);
    const courseId = await assignmentCourseId(pb, delivery.assignment);
    if (!(await canManageCourse(pb, user, courseId))) {
      return { success: false, error: "No autorizado para evaluar esta entrega" };
    }
    
    await pb.collection('deliveries').update(deliveryId, {
      grade,
      feedback,
      verdict,
      status
    });
    
    revalidatePath(`/assignments/${delivery.assignment}`);
    revalidatePath(`/assignments/${delivery.assignment}/deliveries/${deliveryId}`);
    // Revalidate course-scoped TP pages
    revalidatePath('/docentes', 'layout');
    revalidatePath('/estudiantes', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Failed to update delivery evaluation:', error);
    return { success: false, error: 'Failed to update delivery evaluation' };
  }
}
