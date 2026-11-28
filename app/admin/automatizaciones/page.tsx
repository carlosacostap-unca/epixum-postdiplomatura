import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/course-roles";
import type { TeacherDashboardDelivery } from "@/lib/data";
import { teacherDeliveryPresentation } from "@/lib/delivery-presentation";
import { createServerClient, getCurrentUser } from "@/lib/pocketbase-server";
import { deliveryReviewHref } from "@/lib/teacher-review";
import PreevaluateDelivery from "./PreevaluateDelivery";
import type { Assignment } from "@/types";

const path = "/admin/automatizaciones";

export default async function AutomationsPage({ searchParams }: {
  searchParams: Promise<{ page?: string; trabajo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/");

  const params = await searchParams;
  if (typeof params.trabajo === "string" && /^[a-z0-9]{15}$/i.test(params.trabajo)) redirect(`${path}/${params.trabajo}`);
  const requested = Number(params.page);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const pb = await createServerClient();
  const [assignments, pending] = await Promise.all([
    pb.collection("assignments").getFullList<Assignment>({ filter: 'course != ""', fields: "id,title,expand.course.title", expand: "course", sort: "course.title,title" }),
    pb.collection("deliveries").getList<TeacherDashboardDelivery>(page, 25, {
    filter: 'status != "published" && assignment.course != ""',
    sort: "created,id",
    expand: "assignment.course,student",
    fields: "id,assignment,student,status,resubmissionCount,expand.assignment.title,expand.assignment.expand.course.title,expand.assignment.expand.course.aiPreevaluationEnabled,expand.student.firstName,expand.student.lastName,expand.student.name",
    }),
  ]);
  if (page > Math.max(1, pending.totalPages)) redirect(`${path}?page=${Math.max(1, pending.totalPages)}`);

  return <div className="page-container space-y-6">
    <PageHeader eyebrow="Administración" title="Centro de automatizaciones"
      description="El servidor revisa las entregas pendientes según la configuración de cada trabajo. Podés elegir entre preevaluación para revisión docente y publicación automática." />
    <section aria-labelledby="pending-title" className="space-y-4">
      {assignments.length > 0 && <form action={path} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">Configurar un trabajo práctico
          <select name="trabajo" required defaultValue="" className="min-h-11 max-w-full rounded-md border border-[var(--color-outline)] bg-[var(--color-surface-container)] px-3">
            <option value="" disabled>Elegí un trabajo</option>
            {assignments.map(item => <option key={item.id} value={item.id}>{item.expand?.course?.title} · {item.title}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-on-primary)]">Configurar</button>
      </form>}
      <h2 id="pending-title" className="text-lg font-semibold">Trabajos prácticos pendientes de evaluación ({pending.totalItems})</h2>
      {pending.items.length === 0 ? <EmptyState title="Sin entregas pendientes" description="Las próximas entregas y reenvíos aparecerán acá." /> :
        <ul className="divide-y divide-[var(--color-outline-variant)]">
          {pending.items.map(delivery => {
            const assignment = delivery.expand?.assignment;
            const course = assignment?.expand?.course;
            const student = delivery.expand?.student;
            const name = [student?.firstName || student?.name, student?.lastName].filter(Boolean).join(" ") || "Estudiante";
            const state = teacherDeliveryPresentation(delivery);
            return <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="space-y-1">
                <p className="text-sm text-[var(--color-text-muted)]">{course?.title}</p>
                <h3 className="font-semibold">{assignment?.title || "Trabajo práctico"}</h3>
                <p>{name}</p>
                <Badge tone={state.tone}>{state.label}</Badge>
              </div>
              <div className="grid gap-2">
                <Link href={`${path}/${delivery.assignment}`} className="text-sm font-semibold hover:underline">Configurar automatización</Link>
                {course?.aiPreevaluationEnabled ? <PreevaluateDelivery deliveryId={delivery.id} /> : <span className="text-sm">IA deshabilitada en el curso</span>}
                <Link className="font-semibold text-[var(--color-primary)] hover:underline" href={deliveryReviewHref(delivery.assignment, delivery.id, { query: "", filter: "unreviewed" })}>Revisar entrega</Link>
              </div>
            </li>;
          })}
        </ul>}
      {pending.totalPages > 1 && <nav aria-label="Páginas de entregas" className="flex items-center gap-4">
        {page > 1 && <Link href={`${path}?page=${page - 1}`}>Anterior</Link>}
        <span>Página {page} de {pending.totalPages}</span>
        {page < pending.totalPages && <Link href={`${path}?page=${page + 1}`}>Siguiente</Link>}
      </nav>}
    </section>
  </div>;
}
