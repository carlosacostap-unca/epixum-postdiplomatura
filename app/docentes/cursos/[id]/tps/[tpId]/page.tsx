import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import TpTeacherDeliveries from "@/components/TpTeacherDeliveries";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { Badge, Card, CardContent } from "@/components/ui";
import { getAssignment, getCourse, getCourseWeeks, getDeliveries, getLinks } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import TpManagementActions from "./TpManagementActions";
import TpResourceManager from "./TpResourceManager";
import AssignmentAIConfigPanel from "./AssignmentAIConfigPanel";
import { getAssignmentAIConfig } from "@/lib/actions-ai-config";
import { emptyAssignmentAIConfig } from "@/lib/assignment-ai-config";

export const dynamic = "force-dynamic";

export default async function TeacherTpDetailPage({ params }: { params: Promise<{ id: string; tpId: string }> }) {
  const { id, tpId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const course = await getCourse(id);
  if (!course?.teachers?.includes(user.id)) redirect("/docentes");
  const assignment = await getAssignment(tpId).catch(() => null);
  if (!assignment || assignment.course !== course.id) redirect(`/docentes/cursos/${course.id}#trabajos`);

  const [links, deliveries, weeks, aiConfig] = await Promise.all([
    getLinks(tpId, "assignment"),
    getDeliveries(tpId),
    course.organizationMode === "semanal" ? getCourseWeeks(course.id) : [],
    getAssignmentAIConfig(assignment.id),
  ]);
  const isPastDue = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;
  const pending = deliveries.filter((delivery) => delivery.status !== "published").length;

  return (
    <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
      <TeacherCourseContext
        course={course}
        current="trabajos"
        title={assignment.title}
        description={assignment.dueDate ? <>Fecha límite: <FormattedDate date={assignment.dueDate} showTime /></> : "Trabajo sin fecha límite."}
        actions={<TpManagementActions assignment={assignment} courseId={course.id} weeks={weeks} />}
      />

      <div className="flex flex-wrap gap-3">
        <Badge tone={isPastDue ? "error" : "success"}>{isPastDue ? "Plazo cerrado" : "Plazo abierto"}</Badge>
        <Badge tone={pending ? "warning" : "neutral"}>{pending} por revisar</Badge>
        <Badge tone="info">{deliveries.length} {deliveries.length === 1 ? "entrega" : "entregas"}</Badge>
      </div>

      {assignment.description && <Card><CardContent><h2 className="font-headline text-2xl font-bold">Enunciado</h2><div className="prose prose-invert mt-5 max-w-none text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: assignment.description }} /></CardContent></Card>}

      <AssignmentAIConfigPanel assignmentId={assignment.id} courseEnabled={Boolean(course.aiPreevaluationEnabled)} initialConfig={aiConfig || emptyAssignmentAIConfig()} />

      <div className="grid gap-10 xl:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)]">
        <section aria-labelledby="assignment-resources-title" className="space-y-5">
          <div><h2 id="assignment-resources-title" className="font-headline text-2xl font-bold">Recursos</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Material adjunto al enunciado.</p></div>
          <TpResourceManager links={links} assignmentId={assignment.id} />
        </section>
        <section id="entregas" aria-labelledby="deliveries-title" className="scroll-mt-6 space-y-5">
          <div><h2 id="deliveries-title" className="font-headline text-2xl font-bold">Entregas</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Buscá, filtrá y evaluá sin perder el contexto del trabajo.</p></div>
          <TpTeacherDeliveries deliveries={deliveries} courseId={course.id} assignmentId={assignment.id} />
        </section>
      </div>
    </div>
  );
}
