import "server-only";

import type PocketBase from "pocketbase";
import { cache } from "react";
import type { Course, User } from "@/types";
import { createServerClient } from "@/lib/pocketbase-server";
import { hasBedelCourses } from "@/lib/course-bedel-access";
import { getVisitingTeacherAssignments } from "@/lib/course-visiting-teacher-access";
import { resolveCourseParticipation, resolveWorkspaceAccess, type WorkspaceAccess } from "@/lib/course-roles";

function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

export async function hasTeachingCourses(pb: PocketBase, userId: string) {
  const result = await pb.collection("courses").getList<Course>(1, 1, {
    filter: pb.filter("teachers ~ {:userId}", { userId }),
    fields: "id",
  });
  return result.totalItems > 0;
}

export async function isEnrolledInCourse(pb: PocketBase, userId: string, courseId: string) {
  try {
    await pb.collection("course_enrollments").getFirstListItem(
      pb.filter("course = {:courseId} && student = {:userId}", { courseId, userId }),
      { fields: "id" },
    );
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function getWorkspaceAccessWithClient(pb: PocketBase, user: Pick<User, "id" | "role">): Promise<WorkspaceAccess> {
  const [teaches, bedel, visitor] = await Promise.all([
    hasTeachingCourses(pb, user.id), hasBedelCourses(pb), getVisitingTeacherAssignments(pb),
  ]);
  return resolveWorkspaceAccess(user, teaches, bedel, visitor.length > 0);
}

export const getWorkspaceAccess = cache(async (user: Pick<User, "id" | "role">) =>
  getWorkspaceAccessWithClient(await createServerClient(), user));

export async function getCourseParticipation(user: Pick<User, "id" | "role">, course: Pick<Course, "id" | "teachers">) {
  const pb = await createServerClient();
  return resolveCourseParticipation(course, user, await isEnrolledInCourse(pb, user.id, course.id));
}
