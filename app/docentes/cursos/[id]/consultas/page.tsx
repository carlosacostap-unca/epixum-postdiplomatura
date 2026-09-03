import Link from "next/link";
import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { Badge, Card, CardContent, EmptyState, Field, Select } from "@/components/ui";
import { getInquiries } from "@/lib/actions-inquiries";
import { getCourse } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ estado?: string; orden?: string; buscar?: string }>;

export default async function TeacherCourseInquiriesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const course = await getCourse(id);
  if (!course?.teachers?.includes(user.id)) redirect("/docentes");

  const status = query.estado === "Pendiente" || query.estado === "Resuelta" ? query.estado : undefined;
  const sort = query.orden === "recent" ? "recent" : "oldest";
  const search = query.buscar?.trim() || undefined;
  const inquiries = await getInquiries({ courseId: course.id, status, search, sort });
  const pendingCount = inquiries.filter((inquiry) => inquiry.status === "Pendiente").length;

  return (
    <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
      <TeacherCourseContext
        course={course}
        current="consultas"
        title="Consultas"
        description="Priorizá las dudas pendientes y retomá las conversaciones del curso."
        actions={<Link href={`/docentes/cursos/${course.id}/consultas/nueva`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>Nueva consulta</Link>}
      />

      <form method="get" className="grid gap-4 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-5 md:grid-cols-[minmax(0,1fr)_13rem_13rem_auto] md:items-end">
        <Field label="Buscar" id="inquiry-search"><input id="inquiry-search" name="buscar" type="search" defaultValue={search} placeholder="Título, autor o contenido" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5" /></Field>
        <Field label="Estado" id="inquiry-status"><Select id="inquiry-status" name="estado" defaultValue={status || "all"}><option value="all">Todas</option><option value="Pendiente">Pendientes</option><option value="Resuelta">Resueltas</option></Select></Field>
        <Field label="Orden" id="inquiry-order"><Select id="inquiry-order" name="orden" defaultValue={sort}><option value="oldest">Más antiguas primero</option><option value="recent">Más recientes primero</option></Select></Field>
        <button type="submit" className="min-h-11 rounded-full bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold">Aplicar filtros</button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{inquiries.length} {inquiries.length === 1 ? "consulta encontrada" : "consultas encontradas"}</p>
        {!status && <Badge tone={pendingCount ? "warning" : "neutral"}>{pendingCount} pendientes en resultados</Badge>}
      </div>

      {inquiries.length === 0 ? (
        <EmptyState icon="forum" title="No hay consultas con estos filtros" description={search || status ? "Probá una búsqueda más amplia o volvé a ver todas las consultas." : "Las nuevas consultas del curso aparecerán aquí."} action={(search || status) ? <Link href={`/docentes/cursos/${course.id}/consultas`} className="font-bold text-[var(--color-primary)]">Limpiar filtros</Link> : undefined} />
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Link key={inquiry.id} href={`/docentes/cursos/${course.id}/consultas/${inquiry.id}`} className="block rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
              <Card className="transition-colors hover:bg-[var(--color-surface-container)]"><CardContent className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3"><Badge tone={inquiry.status === "Pendiente" ? "warning" : "success"}>{inquiry.status}</Badge>{inquiry.expand?.class && <Badge>{inquiry.expand.class.title}</Badge>}{inquiry.expand?.assignment && <Badge>{inquiry.expand.assignment.title}</Badge>}</div>
                  <h2 className="mt-4 truncate font-headline text-xl font-bold">{inquiry.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-on-surface-variant)]">{inquiry.description}</p>
                  <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">{inquiry.expand?.author?.name || "Usuario"} · <FormattedDate date={inquiry.created} showTime /></p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--color-primary)]">Abrir consulta <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></span>
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
