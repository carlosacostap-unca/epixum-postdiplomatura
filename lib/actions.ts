"use server";

import { createServerClient } from "@/lib/pocketbase-server";
import { revalidatePath } from "next/cache";
import { getPresignedUploadUrl, getPresignedDownloadUrl, configureBucketCors } from "./s3";

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

export async function getResourceUploadUrl(filename: string, fileType: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
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
    if (user.role === 'estudiante' && delivery.student !== user.id) {
        return { success: false, error: 'Unauthorized access to delivery' };
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

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dateStr = formData.get('date') as string;
  const timeStr = formData.get('time') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
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
    const data: any = {
      title,
      description,
      date: dateObj,
      course: courseId, // Relacionar directamente la clase con el curso
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
    const data: any = {
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

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dateStr = formData.get('date') as string;
  const timeStr = formData.get('time') as string;

  try {
    let dateObj = null;
    if (dateStr) {
      if (dateStr.includes('T') && dateStr.endsWith('Z')) {
        dateObj = dateStr;
      } else {
        const dateTimeStr = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
        dateObj = new Date(dateTimeStr).toISOString();
      }
    }

    const data: any = {
      title,
      description,
      date: dateObj,
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

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDateStr = formData.get('dueDate') as string;
  const timeStr = formData.get('time') as string;
  const systemPrompt = formData.get('systemPrompt') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
    let dateObj = null;
    if (dueDateStr) {
      if (dueDateStr.includes('T') && dueDateStr.endsWith('Z')) {
        dateObj = dueDateStr;
      } else {
        const dateTimeStr = timeStr ? `${dueDateStr}T${timeStr}` : `${dueDateStr}T23:59:59`;
        dateObj = new Date(dateTimeStr).toISOString();
      }
    }

    const data: any = {
      title,
      description,
      dueDate: dateObj,
      systemPrompt: systemPrompt || "",
      course: courseId,
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
    const data: any = {
      title,
      description,
      systemPrompt: systemPrompt || "",
    };
    if (dueDate) data.dueDate = new Date(dueDate).toISOString();
    
    await pb.collection('assignments').create(data);
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create assignment:', error);
    if (error.response?.data) {
      console.error('PocketBase validation errors:', JSON.stringify(error.response.data, null, 2));
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

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDate = formData.get('dueDate') as string;
  const systemPrompt = formData.get('systemPrompt') as string;

  try {
    const data: any = {
      title,
      description,
      systemPrompt: systemPrompt || "",
    };
    if (dueDate) data.dueDate = new Date(dueDate).toISOString();

    await pb.collection('assignments').update(assignmentId, data);
    
    revalidatePath('/');
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update assignment:', error);
    if (error.response?.data) {
      console.error('PocketBase validation errors:', JSON.stringify(error.response.data, null, 2));
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

  try {
    await pb.collection('assignments').update(assignmentId, {
      systemPrompt: systemPrompt || "",
    });
    
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update system prompt:', error);
    return { success: false, error: 'Failed to update system prompt' };
  }
}

export async function deleteAssignment(assignmentId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  try {
    await pb.collection('assignments').delete(assignmentId);
    revalidatePath('/');
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

  if (!title || !url || (!classId && !assignmentId)) {
     return { success: false, error: 'Title, URL and Parent ID are required' };
  }

  try {
    const data: any = {
      title,
      url,
      type,
    };
    if (classId) data.class = classId;
    if (assignmentId) data.assignment = assignmentId;
    
    await pb.collection('links').create(data);
    
    if (classId) {
      revalidatePath(`/classes/${classId}`);
      revalidatePath('/docentes', 'layout'); // Revalidate all teacher routes
    }
    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    
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

  const title = formData.get('title') as string;
  const url = formData.get('url') as string;
  const type = formData.get('type') as 'link' | 'file';
  const classId = formData.get('classId') as string;
  const assignmentId = formData.get('assignmentId') as string;

  try {
    const data: any = {
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
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update link:', error);
    return { success: false, error: 'Failed to update link' };
  }
}

export async function deleteLink(linkId: string, parentId?: string, parentType?: 'class' | 'assignment') {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  try {
    await pb.collection('links').delete(linkId);
    
    if (parentId && parentType) {
        if (parentType === 'class') {
          revalidatePath(`/classes/${parentId}`);
          revalidatePath('/docentes', 'layout'); // Revalidate all teacher routes
        }
        if (parentType === 'assignment') revalidatePath(`/assignments/${parentId}`);
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
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
        return { success: false, error: 'El plazo de entrega ha finalizado' };
    }

    const data: Record<string, any> = {
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
    if (delivery.student !== user.id) {
      return { success: false, error: 'No autorizado' };
    }
    const assignment = await pb.collection('assignments').getOne(delivery.assignment);
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

export async function getDeliveryFileDownloadUrl(fileUrl: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    let key = fileUrl;
    if (fileUrl.startsWith('http')) {
      const urlObj = new URL(fileUrl);
      key = decodeURIComponent(urlObj.pathname.split('/').pop() || '');
    }
    if (!key) return { success: false, error: 'Clave de archivo inválida' };
    const downloadUrl = await getPresignedDownloadUrl(key);
    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error('Failed to get file download URL:', error);
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
