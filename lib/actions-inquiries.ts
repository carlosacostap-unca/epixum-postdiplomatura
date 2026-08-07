"use server";

import { createServerClient } from "./pocketbase-server";
import { revalidatePath } from "next/cache";
import { CourseWeek, Inquiry, InquiryResponse } from "@/types";
import { teacherCanManageCourse } from "./teacher-scope";
import { getErrorMessage, getErrorResponse, getErrorStatus } from "./errors";
import { isWeekEffectivelyVisible } from "./course-weeks";

type ServerPocketBase = Awaited<ReturnType<typeof createServerClient>>;

async function canModerateInquiry(
  pb: ServerPocketBase,
  user: { id: string; role?: string },
  inquiry: Pick<Inquiry, "author" | "course" | "week">,
) {
  if (user.role === "admin") return true;
  if (user.role === "estudiante") return inquiry.author === user.id && studentCanAccessInquiry(pb, user.id, inquiry);
  if (user.role !== "docente" || !inquiry.course) return false;
  try {
    const course = await pb.collection("courses").getOne(inquiry.course, { fields: "id,teachers" });
    return teacherCanManageCourse(course, { id: user.id, role: user.role || "" });
  } catch {
    return false;
  }
}

async function studentCanAccessInquiry(
  pb: ServerPocketBase,
  studentId: string,
  inquiry: Pick<Inquiry, "course" | "week">,
) {
  if (!(await studentEnrolledInCourse(pb, studentId, inquiry.course)) || !inquiry.course) return false;
  const course = await pb.collection("courses").getOne(inquiry.course, { fields: "id,organizationMode" });
  if (course.organizationMode !== "semanal") return true;
  if (!inquiry.week) return false;
  try {
    const week = await pb.collection("course_weeks").getOne<CourseWeek>(inquiry.week, { fields: "id,course,status,publishAt" });
    return week.course === inquiry.course && isWeekEffectivelyVisible(week);
  } catch {
    return false;
  }
}

async function studentEnrolledInCourse(pb: ServerPocketBase, studentId: string, courseId?: string) {
  if (!courseId) return false;
  try {
    await pb.collection("course_enrollments").getFirstListItem(
      pb.filter("course = {:courseId} && student = {:studentId}", { courseId, studentId }),
      { fields: "id" },
    );
    return true;
  } catch {
    return false;
  }
}

async function canParticipateInInquiry(
  pb: ServerPocketBase,
  user: { id: string; role?: string },
  inquiry: Pick<Inquiry, "author" | "course" | "week">,
) {
  if (user.role === "estudiante") return studentCanAccessInquiry(pb, user.id, inquiry);
  return canModerateInquiry(pb, user, inquiry);
}

// --- Inquiries ---

export async function getInquiries(filter?: { classId?: string; assignmentId?: string; courseId?: string; weekId?: string; status?: string; authorId?: string; search?: string; sort?: "oldest" | "recent" }) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return [];

  try {
    const filters = [];

    if (filter?.classId) filters.push(`class = "${filter.classId}"`);
    if (filter?.assignmentId) filters.push(`assignment = "${filter.assignmentId}"`);
    if (filter?.courseId) filters.push(`course = "${filter.courseId}"`);
    if (filter?.weekId) filters.push(`week = "${filter.weekId}"`);
    if (filter?.status) filters.push(`status = "${filter.status}"`);
    if (filter?.authorId) filters.push(`author = "${filter.authorId}"`);

    if (filter?.search) {
      const searchTerm = filter.search.replace(/"/g, '\\"');
      
      // Buscar en respuestas (limitado a 50 resultados para no sobrecargar)
      const matchingResponseRecords = await pb.collection("inquiry_responses").getList(1, 50, {
        filter: `content ~ "${searchTerm}"`,
        fields: "inquiry",
      });
      const inquiryIdsFromResponses = matchingResponseRecords.items.map(r => r.inquiry as string);
      
      const orConditions = [
        `title ~ "${searchTerm}"`,
        `description ~ "${searchTerm}"`,
        `author.name ~ "${searchTerm}"`,
        `author.email ~ "${searchTerm}"`,
        `class.title ~ "${searchTerm}"`,
        `assignment.title ~ "${searchTerm}"`,
      ];

      if (inquiryIdsFromResponses.length > 0) {
        // Añadir IDs de inquiries encontradas por respuestas
        // Usamos id = "id1" || id = "id2" ...
        // Para evitar query muy larga, si son muchas, quizás solo tomamos las primeras 20
        const limitedIds = inquiryIdsFromResponses.slice(0, 20);
        limitedIds.forEach(id => {
            if (id) orConditions.push(`id = "${id}"`);
        });
      }

      filters.push(`(${orConditions.join(" || ")})`);
    }

    const filterString = filters.join(" && ");

    const inquiries = await pb.collection("inquiries").getFullList<Inquiry>({
      filter: filterString,
      sort: filter?.sort === "oldest" ? "created" : "-created",
      expand: "author,course,class,assignment,week",
    });

    return inquiries;
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return [];
  }
}

export async function getInquiry(id: string) {
  const pb = await createServerClient();
  try {
    const inquiry = await pb.collection("inquiries").getOne<Inquiry>(id, {
      expand: "author,class,assignment,week",
    });
    return { success: true, data: inquiry };
  } catch (error: unknown) {
    // Suppress 404 errors as they are expected when resource is not found
    if (getErrorStatus(error) !== 404) {
      console.error("Error fetching inquiry:", error);
    }
    return { success: false, error: "Consulta no encontrada" };
  }
}

export async function createInquiry(data: { title: string; description: string; classId?: string; assignmentId?: string; courseId?: string; weekId?: string }) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    let resolvedWeekId = data.weekId;
    let courseMode: string | undefined;
    if (data.courseId) {
      const course = await pb.collection("courses").getOne(data.courseId, { fields: "id,organizationMode,teachers" });
      courseMode = course.organizationMode;
    }
    if (user.role === "estudiante") {
      if (!(await studentEnrolledInCourse(pb, user.id, data.courseId))) {
        return { success: false, error: "No estás matriculado en este curso" };
      }
      if (data.classId) {
        const classRecord = await pb.collection("classes").getOne(data.classId, { fields: "course,week" });
        if (classRecord.course !== data.courseId) return { success: false, error: "La clase no pertenece al curso" };
        if (classRecord.week) {
          if (resolvedWeekId && resolvedWeekId !== classRecord.week) return { success: false, error: "La semana no coincide con la clase" };
          resolvedWeekId = classRecord.week;
        }
      }
      if (data.assignmentId) {
        const assignment = await pb.collection("assignments").getOne(data.assignmentId, { fields: "course,week" });
        if (assignment.course !== data.courseId) return { success: false, error: "El trabajo no pertenece al curso" };
        if (assignment.week) {
          if (resolvedWeekId && resolvedWeekId !== assignment.week) return { success: false, error: "La semana no coincide con el trabajo" };
          resolvedWeekId = assignment.week;
        }
      }
      if (courseMode === "semanal") {
        if (!resolvedWeekId) return { success: false, error: "Seleccioná una semana publicada para crear la consulta" };
        const week = await pb.collection("course_weeks").getOne<CourseWeek>(resolvedWeekId, { fields: "id,course,status,publishAt" });
        if (week.course !== data.courseId || !isWeekEffectivelyVisible(week)) {
          return { success: false, error: "La semana seleccionada no está disponible" };
        }
      }
    }
    if (user.role === "docente" && data.courseId) {
      const course = await pb.collection("courses").getOne(data.courseId, { fields: "id,teachers" });
      if (!teacherCanManageCourse(course, { id: user.id, role: user.role })) {
        return { success: false, error: "No tienes permisos para este curso" };
      }
    }
    const newInquiry: Record<string, string> = {
      title: data.title,
      description: data.description,
      status: "Pendiente",
      author: user.id,
    };

    if (data.classId) newInquiry.class = data.classId;
    if (data.assignmentId) newInquiry.assignment = data.assignmentId;
    if (data.courseId) newInquiry.course = data.courseId;
    if (resolvedWeekId) newInquiry.week = resolvedWeekId;

    const record = await pb.collection("inquiries").create(newInquiry);
    
    revalidatePath("/inquiries");
    if (data.classId) revalidatePath(`/classes/${data.classId}`);
    if (data.assignmentId) revalidatePath(`/assignments/${data.assignmentId}`);
    if (data.courseId) revalidatePath(`/courses/${data.courseId}`);
    
    return { success: true, data: record };
  } catch (error: unknown) {
    console.error("Error creating inquiry:", error);
    const response = getErrorResponse(error);
    if (response) {
      console.error("PB Validation Errors:", JSON.stringify(response, null, 2));
    }
    return { success: false, error: getErrorMessage(error, "Error al crear la consulta") };
  }
}

export async function updateInquiryStatus(id: string, status: "Pendiente" | "Resuelta") {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    const inquiry = await pb.collection("inquiries").getOne<Inquiry>(id, { fields: "author,course,week" });
    if (!(await canModerateInquiry(pb, user, inquiry))) {
      return { success: false, error: "No tienes permisos para actualizar esta consulta" };
    }
    await pb.collection("inquiries").update(id, { status });
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/inquiries");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating inquiry status:", error);
    return { success: false, error: getErrorMessage(error, "Error al actualizar estado") };
  }
}

export async function deleteInquiry(id: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    const inquiry = await pb.collection("inquiries").getOne<Inquiry>(id, { fields: "author,course,week" });
    if (!(await canModerateInquiry(pb, user, inquiry))) {
      return { success: false, error: "No tienes permisos para eliminar esta consulta" };
    }
    await pb.collection("inquiries").delete(id);
    revalidatePath("/inquiries");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting inquiry:", error);
    return { success: false, error: getErrorMessage(error, "Error al eliminar la consulta") };
  }
}

// --- Responses ---

export async function getInquiryResponses(inquiryId: string) {
  const pb = await createServerClient();
  try {
    const responses = await pb.collection("inquiry_responses").getFullList<InquiryResponse>({
      filter: `inquiry = "${inquiryId}"`,
      sort: "created",
      expand: "author",
    });
    return responses;
  } catch (error) {
    console.error("Error fetching responses:", error);
    return [];
  }
}

export async function createInquiryResponse(inquiryId: string, content: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    const inquiry = await pb.collection("inquiries").getOne<Inquiry>(inquiryId, { fields: "author,course,week" });
    if (!(await canParticipateInInquiry(pb, user, inquiry))) {
      return { success: false, error: "No tienes permisos para responder esta consulta" };
    }
    const newResponse = {
      inquiry: inquiryId,
      author: user.id,
      content,
    };

    await pb.collection("inquiry_responses").create(newResponse);
    revalidatePath(`/inquiries/${inquiryId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Error creating response:", error);
    return { success: false, error: getErrorMessage(error, "Error al enviar respuesta") };
  }
}

export async function deleteInquiryResponse(responseId: string, inquiryId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    await pb.collection("inquiry_responses").delete(responseId);
    revalidatePath(`/inquiries/${inquiryId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting response:", error);
    return { success: false, error: getErrorMessage(error, "Error al eliminar respuesta") };
  }
}
