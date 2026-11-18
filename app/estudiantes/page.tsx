import { redirect } from "next/navigation";
import { getStudentDashboardData, getStudentPendingInvitations } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import StudentDashboard from "@/components/student/StudentDashboard";
import { fiaCourseId, getPendingFiaMakeup } from "@/lib/fia-makeup";
import { FiaMakeupNotice } from "@/components/student/FiaMakeupNotice";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ buscar?: string; estado?: string }>;

export default async function EstudiantesDashboard({ searchParams }: { searchParams: SearchParams }) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect("/login");
  const [dashboard, pendingInvitations] = await Promise.all([
    getStudentDashboardData(user.id),
    getStudentPendingInvitations(),
  ]);
  const status = query.estado === "en curso" || query.estado === "finalizado" || query.estado === "borrador" ? query.estado : "all";
  const makeup = dashboard.courses.some(course => course.id === fiaCourseId) ? await getPendingFiaMakeup(fiaCourseId, user.id) : null;
  return <StudentDashboard notice={makeup && <FiaMakeupNotice makeup={makeup} />} dashboard={dashboard} invitations={pendingInvitations} firstName={user.firstName || user.name?.split(" ")[0] || "Estudiante"} query={query.buscar || ""} status={status} />;
}
