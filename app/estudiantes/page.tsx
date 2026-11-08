import { redirect } from "next/navigation";
import { getStudentDashboardData, getStudentPendingInvitations } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import StudentDashboard from "@/components/student/StudentDashboard";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ buscar?: string; estado?: string }>;

export default async function EstudiantesDashboard({ searchParams }: { searchParams: SearchParams }) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect("/login");
  const [dashboard, pendingInvitations] = await Promise.all([
    getStudentDashboardData(user.id),
    getStudentPendingInvitations(),
  ]);
  const status = query.estado === "en curso" || query.estado === "finalizado" ? query.estado : "all";
  return <StudentDashboard dashboard={dashboard} invitations={pendingInvitations} firstName={user.firstName || user.name?.split(" ")[0] || "Estudiante"} query={query.buscar || ""} status={status} />;
}
