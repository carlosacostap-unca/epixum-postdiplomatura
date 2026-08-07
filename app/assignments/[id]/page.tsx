import { getAssignment } from "@/lib/data";
import { getHomeForRole } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const assignment = await getAssignment(id).catch(() => null);
  if (!assignment) notFound();
  if (!assignment.course || user.role === "admin") redirect(getHomeForRole(user.role));

  const area = user.role === "docente" ? "docentes" : "estudiantes";
  redirect(`/${area}/cursos/${assignment.course}/tps/${id}`);
}
