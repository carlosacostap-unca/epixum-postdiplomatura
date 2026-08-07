import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import TpStudentDelivery from "@/components/TpStudentDelivery";
import { StudentCourseContext } from "@/components/course/StudentCourseContext";
import { Badge, Card, CardContent } from "@/components/ui";
import { getAssignment, getCourse, getLinks, getUserDelivery, isStudentEnrolled, studentCanAccessCourseContent } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { getDeadlineState } from "@/lib/student-learning";
import StudentTpResources from "./StudentTpResources";

export const dynamic = "force-dynamic";

export default async function StudentTpDetailPage({ params }: { params: Promise<{ id: string; tpId: string }> }) {
  const { id, tpId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "estudiante") redirect("/");
  const course = await getCourse(id);
  if (!course || !(await isStudentEnrolled(course.id, user.id))) redirect("/estudiantes");
  const assignment = await getAssignment(tpId).catch(() => null);
  if (!assignment || assignment.course !== course.id || !(await studentCanAccessCourseContent(course, assignment.week))) redirect(`/estudiantes/cursos/${course.id}${course.organizationMode === "semanal" ? "#semanas" : "#trabajos"}`);
  const [links, delivery] = await Promise.all([getLinks(tpId, "assignment"), getUserDelivery(tpId, user.id)]);
  const deadline = getDeadlineState(assignment.dueDate);
  const temporal = deadline === "overdue" ? { tone: "error" as const, label: "Plazo cerrado" } : deadline === "due-soon" ? { tone: "warning" as const, label: "Vence en menos de 72 h" } : { tone: "success" as const, label: "Plazo abierto" };
  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12"><StudentCourseContext course={course} current="trabajos" title={assignment.title} description={assignment.dueDate ? <>Fecha límite: <FormattedDate date={assignment.dueDate} showTime /></> : "Trabajo sin fecha límite."} /><div className="flex flex-wrap gap-3"><Badge tone={temporal.tone}>{temporal.label}</Badge><Badge tone={delivery ? delivery.status === "published" ? "success" : "info" : "neutral"}>{delivery ? delivery.status === "published" ? "Evaluado" : "Entrega registrada" : "Sin entrega"}</Badge></div>{assignment.description && <Card><CardContent><h2 className="font-headline text-2xl font-bold">Enunciado</h2><div className="prose prose-invert mt-5 max-w-none text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: assignment.description }} /></CardContent></Card>}<div className="grid gap-10 xl:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)]"><section className="space-y-5"><div><h2 className="font-headline text-2xl font-bold">Recursos</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Material adjunto al enunciado.</p></div><StudentTpResources links={links} /></section><section className="space-y-5"><div><h2 className="font-headline text-2xl font-bold">Mi entrega</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Estado, archivos y devolución del docente.</p></div><TpStudentDelivery assignmentId={assignment.id} courseId={course.id} delivery={delivery} dueDate={assignment.dueDate} /></section></div></div>;
}
