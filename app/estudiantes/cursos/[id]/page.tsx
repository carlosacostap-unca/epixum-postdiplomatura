import { getCourse, getClassesByCourse, getAssignmentsByCourse } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";

export const dynamic = 'force-dynamic';

export default async function EstudianteCoursePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "estudiante") {
    redirect("/");
  }

  const course = await getCourse(params.id);
  if (!course) {
    redirect("/estudiantes");
  }

  // Ensure the student is actually enrolled in this course
  const isEnrolled = course.expand?.students?.some(student => student.id === user.id);
  if (!isEnrolled) {
    redirect("/estudiantes");
  }

  const classes = await getClassesByCourse(course.id);
  const assignments = await getAssignmentsByCourse(course.id);

  // Ordenar clases cronológicamente (más antiguas primero)
  const sortedClasses = [...classes].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full">
      {/* Back button */}
      <Link 
        href="/estudiantes" 
        className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors mb-8 md:mb-12 group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="font-bold text-sm tracking-widest uppercase">Volver a mis cursos</span>
      </Link>

      {/* Asymmetrical Hero Section */}
      <header className="mb-12 md:mb-24 flex flex-col md:flex-row gap-10 md:gap-20 items-start justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
              Detalle del Curso
            </span>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] ${
              course.status === 'en curso' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 
              course.status === 'finalizado' ? 'bg-[var(--color-on-surface-variant)]/10 text-[var(--color-on-surface-variant)]' : 
              'bg-[#FFB4A4]/10 text-[#FFB4A4]'
            }`}>
              {course.status || 'EN CURSO'}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-headline tracking-tight text-[var(--color-on-surface)] mb-6 leading-tight">
            {course.title}
          </h1>
          {course.description && (
            <div className="text-[var(--color-on-surface-variant)] text-lg md:text-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: course.description }} />
          )}
        </div>

        {/* Floating Stats Card */}
        <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-8 w-full md:min-w-[280px] md:w-auto relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] flex flex-col gap-8 border border-[var(--color-outline-variant)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 blur-[40px] -z-10 rounded-full pointer-events-none"></div>
          
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] mb-2">
              Clases Programadas
            </p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-headline font-bold text-[var(--color-on-surface)] leading-none">
                {sortedClasses.length}
              </span>
              <span className="material-symbols-outlined text-2xl text-[var(--color-primary)]">menu_book</span>
            </div>
          </div>

          <div>
            <Link 
              href={`/estudiantes/cursos/${course.id}/consultas`}
              className="flex items-center justify-between w-full p-4 bg-[var(--color-surface-container-highest)] rounded-2xl hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors group border border-[var(--color-outline-variant)]"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">forum</span>
                <span className="font-bold text-sm">Foro de Consultas</span>
              </div>
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-12">
        {/* Classes Section */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-headline font-bold text-[var(--color-on-surface)] flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--color-primary)]">video_library</span>
              Clases y Materiales
            </h2>
          </div>

          {sortedClasses.length === 0 ? (
            <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center border border-[var(--color-outline-variant)]">
              <span className="material-symbols-outlined text-5xl text-[var(--color-on-surface-variant)] mb-4">menu_book</span>
              <p className="text-[var(--color-on-surface-variant)] text-lg">Aún no hay clases publicadas para este curso.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {sortedClasses.map((c) => (
                <Link 
                  href={`/estudiantes/cursos/${course.id}/clases/${c.id}`}
                  key={c.id} 
                  className="bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] transition-colors rounded-[2rem] p-6 md:p-8 border border-[var(--color-outline-variant)] flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                >
                  <div>
                    <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{c.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-[var(--color-on-surface-variant)]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        <span>{c.date ? <FormattedDate date={c.date} /> : 'Sin fecha'}</span>
                      </div>
                      {c.date && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span><FormattedDate date={c.date} options={{ hour: '2-digit', minute: '2-digit' }} /> hs</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="px-6 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-full group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-sm whitespace-nowrap flex items-center justify-center w-full md:w-auto gap-2 shrink-0">
                    <span>Ver Contenido</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Trabajos Prácticos Section */}
        {assignments.length > 0 && (
          <div className="flex flex-col gap-8">
            <h2 className="text-3xl font-headline font-bold text-[var(--color-on-surface)] flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--color-primary)]">assignment</span>
              Trabajos Prácticos
            </h2>
            <div className="flex flex-col gap-6">
              {assignments.map((tp) => {
                const isPastDue = tp.dueDate ? new Date() > new Date(tp.dueDate) : false;
                return (
                  <Link
                    href={`/estudiantes/cursos/${course.id}/tps/${tp.id}`}
                    key={tp.id}
                    className="bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] transition-colors rounded-[2rem] p-6 md:p-8 border border-[var(--color-outline-variant)] flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{tp.title}</h3>
                      {tp.dueDate && (
                        <p className={`text-sm flex items-center gap-1.5 ${isPastDue ? 'text-red-400' : 'text-[var(--color-on-surface-variant)]'}`}>
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          Entrega: <FormattedDate date={tp.dueDate} />
                          {isPastDue && <span className="ml-1 text-xs font-bold uppercase tracking-wider">(Cerrado)</span>}
                        </p>
                      )}
                    </div>
                    <span className="px-6 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-full group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-sm whitespace-nowrap flex items-center justify-center w-full md:w-auto gap-2 shrink-0">
                      <span>Ver TP</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}