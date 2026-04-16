import { getCourse, getClass, getLinks } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import StudentResourceList from "./StudentResourceList";

export const dynamic = 'force-dynamic';

export default async function EstudianteClassPage(props: { params: Promise<{ id: string, classId: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "estudiante") {
    redirect("/");
  }

  const course = await getCourse(params.id);
  if (!course) {
    redirect("/estudiantes");
  }

  const isEnrolled = course.expand?.students?.some(student => student.id === user.id);
  if (!isEnrolled) {
    redirect("/estudiantes");
  }

  const classData = await getClass(params.classId);
  if (!classData || classData.course !== course.id) {
    redirect(`/estudiantes/cursos/${course.id}`);
  }

  const links = await getLinks(classData.id, 'class');

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full">
      {/* Back button */}
      <Link 
        href={`/estudiantes/cursos/${course.id}`} 
        className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors mb-8 md:mb-12 group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="font-bold text-sm tracking-widest uppercase">Volver al curso</span>
      </Link>

      {/* Hero Section */}
      <header className="mb-16">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
            Clase
          </span>
          <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]">
            {course.title}
          </span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-headline tracking-tight text-[var(--color-on-surface)] mb-6 leading-tight">
              {classData.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-[var(--color-on-surface-variant)]">
              <div className="flex items-center gap-2 bg-[var(--color-surface-container-low)] px-4 py-2 rounded-full border border-[var(--color-outline-variant)]">
                <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">calendar_today</span>
                <span className="font-medium text-sm">
                  {classData.date ? <FormattedDate date={classData.date} /> : 'Sin fecha'}
                </span>
              </div>
              
              {classData.date && (
                <div className="flex items-center gap-2 bg-[var(--color-surface-container-low)] px-4 py-2 rounded-full border border-[var(--color-outline-variant)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">schedule</span>
                  <span className="font-medium text-sm">
                    <FormattedDate date={classData.date} options={{ hour: '2-digit', minute: '2-digit' }} /> hs
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Main Details */}
        <div className="xl:col-span-2 flex flex-col gap-12">
          {/* Description */}
          <section className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-6 md:p-10 border border-[var(--color-outline-variant)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-[var(--color-primary)]/5 blur-[40px] -z-10 rounded-full pointer-events-none"></div>
            <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-primary)]">description</span>
              Descripción
            </h2>
            {classData.description ? (
              <div className="text-[var(--color-on-surface-variant)] leading-relaxed whitespace-pre-wrap text-lg">
                {classData.description}
              </div>
            ) : (
              <p className="text-[var(--color-on-surface-variant)]/60 italic">El docente no ha añadido una descripción para esta clase.</p>
            )}
          </section>

          {/* Resources */}
          <StudentResourceList links={links} classId={classData.id} />
        </div>

        {/* Sidebar Help */}
        <div className="flex flex-col gap-8">
          <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-8 border border-[var(--color-outline-variant)] flex flex-col gap-4 text-center items-center justify-center h-full">
            <span className="material-symbols-outlined text-4xl text-[var(--color-primary)] mb-2">support_agent</span>
            <h3 className="font-bold text-[var(--color-on-surface)] text-lg">¿Tienes dudas?</h3>
            <p className="text-[var(--color-on-surface-variant)] text-sm mb-4">
              Si no entiendes algo del material o tienes preguntas sobre esta clase, puedes enviar una consulta al docente.
            </p>
            <Link 
              href={`/estudiantes/cursos/${course.id}/consultas/nueva`}
              className="px-6 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-full hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-sm w-full"
            >
              Hacer una consulta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}