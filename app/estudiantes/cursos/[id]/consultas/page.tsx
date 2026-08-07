import Link from "next/link";
import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import { StudentCourseContext } from "@/components/course/StudentCourseContext";
import { Badge, Card, CardContent, EmptyState, Field, Select } from "@/components/ui";
import { getInquiries } from "@/lib/actions-inquiries";
import { getCourse, getCourseOrganizationData, isStudentEnrolled } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ buscar?: string; estado?: string; autor?: string; semana?: string }>;

export default async function EstudianteCourseInquiriesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user || user.role !== "estudiante") redirect("/");
  const course = await getCourse(id);
  if (!course || !(await isStudentEnrolled(course.id, user.id))) redirect("/estudiantes");
  const weekly = course.organizationMode === "semanal";
  const organization = weekly ? await getCourseOrganizationData(course) : null;
  const weeks = organization?.weeks || [];
  const weekId = weeks.some((week) => week.id === query.semana) ? query.semana : undefined;
  const status = query.estado === "Pendiente" || query.estado === "Resuelta" ? query.estado : undefined;
  const mine = query.autor === "mis-consultas";
  const [rawInquiries, rawOwnPending] = await Promise.all([
    getInquiries({ courseId: course.id, weekId, status, authorId: mine ? user.id : undefined, search: query.buscar?.trim() || undefined, sort: "recent" }),
    getInquiries({ courseId: course.id, status: "Pendiente", authorId: user.id, sort: "recent" }),
  ]);
  const visibleWeekIds = new Set(weeks.map((week) => week.id));
  const inquiries = weekly ? rawInquiries.filter((item) => Boolean(item.week && visibleWeekIds.has(item.week))) : rawInquiries;
  const ownPending = weekly ? rawOwnPending.filter((item) => Boolean(item.week && visibleWeekIds.has(item.week))) : rawOwnPending;

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <StudentCourseContext course={course} current="consultas" title="Consultas" description={weekly ? "Conversaciones organizadas dentro de cada semana publicada." : "Retomá tus conversaciones o participá en las dudas del curso."} actions={<Link href={`/estudiantes/cursos/${course.id}/consultas/nueva${weekId ? `?semana=${weekId}` : ""}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>Nueva consulta</Link>} />
    {ownPending.length > 0 && <section aria-labelledby="own-pending-title" className="space-y-4"><div><h2 id="own-pending-title" className="font-headline text-2xl font-bold">Retomar mis consultas</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Tus conversaciones que todavía necesitan atención.</p></div><div className="grid gap-4 md:grid-cols-2">{ownPending.slice(0, 4).map((inquiry) => <Link key={inquiry.id} href={`/estudiantes/cursos/${course.id}/consultas/${inquiry.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent><div className="flex flex-wrap gap-2"><Badge tone="warning">Pendiente · Tu consulta</Badge>{inquiry.expand?.week && <Badge tone="info">Semana {inquiry.expand.week.number}</Badge>}</div><h3 className="mt-4 font-headline text-xl font-bold">{inquiry.title}</h3><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Última actividad <FormattedDate date={inquiry.updated || inquiry.created} showTime /></p></CardContent></Card></Link>)}</div></section>}
    <form method="get" className={`grid gap-4 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-5 ${weekly ? "md:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_auto]" : "md:grid-cols-[minmax(0,1fr)_13rem_13rem_auto]"} md:items-end`}>
      <Field id="forum-search" label="Buscar"><input name="buscar" type="search" defaultValue={query.buscar} placeholder="Título, autor o contenido" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5" /></Field>
      {weekly && <Field id="forum-week" label="Semana"><Select name="semana" defaultValue={weekId || "all"}><option value="all">Todas</option>{weeks.map((week) => <option key={week.id} value={week.id}>Semana {week.number}</option>)}</Select></Field>}
      <Field id="forum-status" label="Estado"><Select name="estado" defaultValue={status || "all"}><option value="all">Todas</option><option value="Pendiente">Pendientes</option><option value="Resuelta">Resueltas</option></Select></Field>
      <Field id="forum-author" label="Autor"><Select name="autor" defaultValue={mine ? "mis-consultas" : "all"}><option value="all">Todo el curso</option><option value="mis-consultas">Mis consultas</option></Select></Field>
      <button type="submit" className="min-h-11 rounded-full bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold">Aplicar filtros</button>
    </form>
    <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{inquiries.length} {inquiries.length === 1 ? "consulta encontrada" : "consultas encontradas"}</p>
    {inquiries.length === 0 ? <EmptyState icon="forum" title="No hay consultas con estos filtros" description="Probá una búsqueda más amplia o creá una nueva conversación." action={<Link href={`/estudiantes/cursos/${course.id}/consultas`} className="font-bold text-[var(--color-primary)]">Limpiar filtros</Link>} /> : <div className="space-y-4">{inquiries.map((inquiry) => <Link key={inquiry.id} href={`/estudiantes/cursos/${course.id}/consultas/${inquiry.id}`} className="block rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="transition-colors hover:bg-[var(--color-surface-container)]"><CardContent className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge tone={inquiry.status === "Pendiente" ? "warning" : "success"}>{inquiry.status}</Badge>{inquiry.author === user.id && <Badge tone="info">Tu consulta</Badge>}{inquiry.expand?.week && <Badge tone="info">Semana {inquiry.expand.week.number}</Badge>}{inquiry.expand?.class && <Badge>{inquiry.expand.class.title}</Badge>}</div><h2 className="mt-4 truncate font-headline text-xl font-bold">{inquiry.title}</h2><p className="mt-2 line-clamp-2 text-sm text-[var(--color-on-surface-variant)]">{inquiry.description}</p><p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">{inquiry.expand?.author?.name || "Usuario"} · <FormattedDate date={inquiry.updated || inquiry.created} showTime /></p></div><span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--color-primary)]">Abrir conversación <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></span></CardContent></Card></Link>)}</div>}
  </div>;
}
