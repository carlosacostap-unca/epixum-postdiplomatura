import Link from "next/link";
import { getAllCourses } from "@/lib/data";
import { Badge, DataTable, PageHeader, Select, type DataColumn } from "@/components/ui";
import FormattedDate from "@/components/FormattedDate";
import type { Course } from "@/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const valueOf = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || "" : value || "";

export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = valueOf(params.q).trim().toLocaleLowerCase("es");
  const status = valueOf(params.status);
  const sort = valueOf(params.sort) || "newest";
  const courses = await getAllCourses();
  const filtered = courses
    .filter((course) => !query || course.title.toLocaleLowerCase("es").includes(query) || course.expand?.teachers?.some((teacher) => teacher.name?.toLocaleLowerCase("es").includes(query)))
    .filter((course) => !status || course.status === status)
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "es") : sort === "oldest" ? a.created.localeCompare(b.created) : b.created.localeCompare(a.created));

  const columns: DataColumn<Course>[] = [
    { id: "title", header: "Curso", render: (course) => <div><p className="font-bold">{course.title}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{course.expand?.teachers?.map((teacher) => teacher.name || teacher.username).join(", ") || "Sin docente"}</p></div> },
    { id: "status", header: "Estado", render: (course) => <Badge tone={course.status === "en curso" ? "success" : course.status === "borrador" ? "warning" : "neutral"}>{course.status}</Badge> },
    { id: "start", header: "Inicio", render: (course) => course.startDate ? <FormattedDate date={course.startDate} /> : "Sin fecha" },
    { id: "end", header: "Fin", render: (course) => course.endDate ? <FormattedDate date={course.endDate} /> : "Sin fecha" },
    { id: "actions", header: "Acciones", render: (course) => <Link href={`/admin/courses/${course.id}`} className="font-bold text-[var(--color-primary)] hover:underline">Editar curso</Link> },
  ];

  return (
    <div className="p-6 md:p-10 xl:p-12">
      <PageHeader eyebrow="Administración" title="Cursos" description="Gestioná el catálogo, sus estados y docentes." actions={<Link href="/admin/courses/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined" aria-hidden="true">add</span>Nuevo curso</Link>} />
      <form className="mt-8 grid gap-3 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-4 md:grid-cols-[1fr_13rem_13rem_auto]" role="search">
        <label className="sr-only" htmlFor="course-search">Buscar cursos</label>
        <input id="course-search" name="q" defaultValue={valueOf(params.q)} placeholder="Buscar por curso o docente" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4" />
        <label className="sr-only" htmlFor="course-status">Estado</label>
        <Select id="course-status" name="status" defaultValue={status}><option value="">Todos los estados</option><option value="borrador">Borrador</option><option value="en curso">En curso</option><option value="finalizado">Finalizado</option></Select>
        <label className="sr-only" htmlFor="course-sort">Orden</label>
        <Select id="course-sort" name="sort" defaultValue={sort}><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option><option value="title">Título A–Z</option></Select>
        <button className="min-h-11 rounded-full bg-[var(--color-surface-container-highest)] px-5 text-sm font-bold">Aplicar</button>
      </form>
      <p className="my-5 text-sm text-[var(--color-on-surface-variant)]" role="status">{filtered.length} {filtered.length === 1 ? "curso" : "cursos"}</p>
      <DataTable ariaLabel="Cursos de la plataforma" items={filtered} columns={columns} getKey={(course) => course.id} />
    </div>
  );
}
