import { getCourse, getAssignment, getLinks, getUserDelivery } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import TpStudentDelivery from "@/components/TpStudentDelivery";

export const dynamic = 'force-dynamic';

export default async function StudentTpDetailPage(props: {
  params: Promise<{ id: string; tpId: string }>;
}) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "estudiante") redirect("/");

  const course = await getCourse(params.id);
  if (!course) redirect("/estudiantes");

  const isEnrolled = course.expand?.students?.some((s) => s.id === user.id);
  if (!isEnrolled) redirect("/estudiantes");

  let assignment;
  try {
    assignment = await getAssignment(params.tpId);
  } catch {
    redirect(`/estudiantes/cursos/${params.id}`);
  }

  const links = await getLinks(params.tpId, "assignment");
  const delivery = await getUserDelivery(params.tpId, user.id);

  const isPastDue = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full">
      <Link
        href={`/estudiantes/cursos/${course.id}`}
        className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors mb-8 md:mb-12 group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="font-bold text-sm tracking-widest uppercase">Volver al curso</span>
      </Link>

      {/* Header */}
      <header className="mb-12 md:mb-16">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
            Trabajo Práctico
          </span>
          <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]">
            {course.title}
          </span>
          {isPastDue && (
            <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400">
              Plazo cerrado
            </span>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-headline tracking-tight text-[var(--color-on-surface)] mb-4 leading-tight">
          {assignment.title}
        </h1>
        {assignment.dueDate && (
          <p className={`flex items-center gap-2 text-sm font-medium mb-6 ${isPastDue ? 'text-red-400' : 'text-[var(--color-on-surface-variant)]'}`}>
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            Fecha límite: <FormattedDate date={assignment.dueDate} showTime />
          </p>
        )}
        {assignment.description && (
          <div
            className="prose prose-invert max-w-3xl text-[var(--color-on-surface-variant)] text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: assignment.description }}
          />
        )}
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Resources */}
        {links.length > 0 && (
          <div className="xl:col-span-1 flex flex-col gap-6">
            <h2 className="text-2xl font-headline font-bold text-[var(--color-on-surface)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-primary)]">attach_file</span>
              Recursos
            </h2>
            <div className="flex flex-col gap-3">
              {links.map((link) => {
                const isFile =
                  link.type === 'file' ||
                  link.url.includes('idrivee2.com') ||
                  link.url.includes('epixum-javascript-storage');
                return (
                  <a
                    key={link.id}
                    href={isFile ? '#' : link.url}
                    target={isFile ? undefined : '_blank'}
                    rel={isFile ? undefined : 'noopener noreferrer'}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-container)] transition-colors group"
                  >
                    <span className={`material-symbols-outlined text-[20px] shrink-0 ${isFile ? 'text-[var(--color-primary)]' : 'text-blue-400'}`}>
                      {isFile ? 'description' : 'link'}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors flex-1 truncate">
                      {link.title}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)] shrink-0">
                      {isFile ? 'download' : 'open_in_new'}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery */}
        <div className={`${links.length > 0 ? 'xl:col-span-2' : 'xl:col-span-3'} flex flex-col gap-6`}>
          <h2 className="text-2xl font-headline font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--color-primary)]">assignment_turned_in</span>
            Mi entrega
          </h2>
          <TpStudentDelivery
            assignmentId={assignment.id}
            courseId={course.id}
            delivery={delivery}
            dueDate={assignment.dueDate}
          />
        </div>
      </div>
    </div>
  );
}
