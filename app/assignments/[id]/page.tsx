import { getAssignment, getCourse } from "@/lib/data";
import { getCourseParticipation, getWorkspaceAccess } from "@/lib/course-role-access";
import { getHomeForWorkspace } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const assignment = await getAssignment(id).catch(() => null);
  if (!assignment) notFound();
  if (!assignment.course) redirect(getHomeForWorkspace((await getWorkspaceAccess(user)).preferred));
  const course = await getCourse(assignment.course).catch(() => null);
  if (!course) notFound();
  const participation = await getCourseParticipation(user, course);
  if (participation === "admin") redirect("/admin");
  if (participation !== "docente" && participation !== "estudiante") redirect(getHomeForWorkspace((await getWorkspaceAccess(user)).preferred));
  const area = participation === "docente" ? "docentes" : "estudiantes";
  redirect(`/${area}/cursos/${assignment.course}/tps/${id}`);
}
