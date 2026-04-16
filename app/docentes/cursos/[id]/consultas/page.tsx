import { getCourse } from "@/lib/data";
import { getInquiries } from "@/lib/actions-inquiries";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";

export const dynamic = 'force-dynamic';

export default async function TeacherCourseInquiriesPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const course = await getCourse(params.id);
  if (!course) {
    redirect("/docentes");
  }

  const inquiries = await getInquiries({ courseId: course.id });

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full">
      {/* Back button */}
      <Link 
        href={`/docentes/cursos/${course.id}`} 
        className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors mb-8 md:mb-12 group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="font-bold text-sm tracking-widest uppercase">Volver al curso</span>
      </Link>

      <header className="mb-12 md:mb-24 flex flex-col md:flex-row gap-10 md:gap-20 items-start justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
              Foro de Consultas
            </span>
            <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]">
              {course.title}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-headline tracking-tight text-[var(--color-on-surface)] mb-6 leading-tight">
            Foro de Consultas
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-lg md:text-xl leading-relaxed">
            Revisa y responde las dudas de los estudiantes o inicia una nueva consulta para este curso.
          </p>
        </div>

        <Link 
          href={`/docentes/cursos/${course.id}/consultas/nueva`}
          className="flex items-center gap-2 px-8 py-4 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary)]/90 transition-colors font-bold shadow-[0_0_30px_var(--color-primary)]/30 w-full md:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Nueva Consulta</span>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {inquiries.length === 0 ? (
          <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center border border-[var(--color-outline-variant)]">
            <span className="material-symbols-outlined text-5xl text-[var(--color-on-surface-variant)] mb-4">forum</span>
            <p className="text-[var(--color-on-surface-variant)] text-lg">No hay consultas para este curso todavía.</p>
          </div>
        ) : (
          inquiries.map((inquiry) => (
            <Link 
              key={inquiry.id}
              href={`/docentes/cursos/${course.id}/consultas/${inquiry.id}`}
              className="bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] transition-colors rounded-[2rem] p-6 md:p-8 border border-[var(--color-outline-variant)] flex flex-col md:flex-row md:items-center justify-between gap-6 group"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                    inquiry.status === "Resuelta"
                      ? "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]"
                      : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  }`}>
                    {inquiry.status}
                  </span>
                  {(inquiry.expand?.class || inquiry.expand?.assignment) && (
                    <span className="text-sm text-[var(--color-on-surface-variant)] flex items-center gap-1 font-medium">
                      En: 
                      {inquiry.expand?.class && <span className="text-[var(--color-on-surface)]">{inquiry.expand.class.title}</span>}
                      {inquiry.expand?.assignment && <span className="text-[var(--color-on-surface)]">{inquiry.expand.assignment.title}</span>}
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {inquiry.title}
                </h3>
                
                <p className="text-[var(--color-on-surface-variant)] text-sm line-clamp-2 mb-4">
                  {inquiry.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-[var(--color-on-surface-variant)]">
                  <div className="flex items-center gap-2">
                    {inquiry.expand?.author?.avatar ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/_pb_users_auth_/${inquiry.expand.author.id}/${inquiry.expand.author.avatar}`}
                        className="w-6 h-6 rounded-full object-cover border border-[var(--color-outline-variant)]"
                        alt=""
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[var(--color-surface-container-highest)] flex items-center justify-center text-xs font-bold text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]">
                        {(inquiry.expand?.author?.name || inquiry.expand?.author?.firstName || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">
                      {inquiry.expand?.author?.name || [inquiry.expand?.author?.firstName, inquiry.expand?.author?.lastName].filter(Boolean).join(" ") || "Usuario"}
                    </span>
                  </div>
                  <span>•</span>
                  <FormattedDate date={inquiry.created} showTime={true} />
                </div>
              </div>
              
              <span className="px-6 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-full group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-sm whitespace-nowrap flex items-center justify-center w-full md:w-auto gap-2 shrink-0">
                <span>Ver Consulta</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}