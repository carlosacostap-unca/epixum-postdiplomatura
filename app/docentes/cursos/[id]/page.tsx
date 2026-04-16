import { getCourse, getClassesByCourse } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";

export default async function TeacherCourseManagementPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const course = await getCourse(params.id);
  if (!course) {
    redirect("/docentes");
  }

  const classes = await getClassesByCourse(course.id);
  const students = course.expand?.students || [];

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full">
      {/* Back button */}
      <Link 
        href="/docentes" 
        className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors mb-8 md:mb-12 group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="font-bold text-sm tracking-widest uppercase">Volver al panel</span>
      </Link>

      {/* Asymmetrical Hero Section */}
      <header className="mb-12 md:mb-24 flex flex-col md:flex-row gap-10 md:gap-20 items-start justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
              Gestión de Curso
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
            <p className="text-[var(--color-on-surface-variant)] text-lg md:text-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: course.description }} />
          )}
        </div>

        {/* Floating Stats Card */}
        <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-8 w-full md:min-w-[280px] md:w-auto relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] flex flex-col gap-8 border border-[var(--color-outline-variant)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 blur-[40px] -z-10 rounded-full pointer-events-none"></div>
          
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] mb-2">
              Estudiantes
            </p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-headline font-bold text-[var(--color-on-surface)] leading-none">
                {students.length}
              </span>
              <span className="material-symbols-outlined text-2xl text-[var(--color-primary)]">group</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] mb-2">
              Clases Programadas
            </p>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-headline font-bold text-[var(--color-on-surface)] leading-none">
                {classes.length}
              </span>
              <span className="material-symbols-outlined text-2xl text-[var(--color-primary)]">menu_book</span>
            </div>
          </div>

          <div>
            <Link 
              href={`/docentes/cursos/${course.id}/consultas`}
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Classes Section */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-headline font-bold text-[var(--color-on-surface)]">Clases</h2>
            <Link 
              href={`/docentes/cursos/${course.id}/clases/nueva`} 
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-[#000000] rounded-full hover:opacity-90 transition-opacity font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(63,255,139,0.2)]"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Nueva Clase</span>
            </Link>
          </div>

          {classes.length === 0 ? (
            <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center border border-[var(--color-outline-variant)]">
              <span className="material-symbols-outlined text-5xl text-[var(--color-on-surface-variant)] mb-4">menu_book</span>
              <p className="text-[var(--color-on-surface-variant)] text-lg">No hay clases creadas para este curso.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {classes.map((c) => (
                <Link 
                  href={`/docentes/cursos/${course.id}/clases/${c.id}`}
                  key={c.id} 
                  className="bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] transition-colors rounded-[2rem] p-6 md:p-8 border border-[var(--color-outline-variant)] flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                >
                  <div>
                    <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{c.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-[var(--color-on-surface-variant)]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        <span>{c.date ? <FormattedDate date={c.date} /> : 'Sin fecha programada'}</span>
                      </div>
                      {c.date && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span><FormattedDate date={c.date} options={{ hour: '2-digit', minute: '2-digit' }} /> hs</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="px-6 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-full group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-sm whitespace-nowrap flex items-center justify-center w-full md:w-auto gap-2">
                    <span>Gestionar</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Students Section */}
        <div className="flex flex-col gap-8">
          <h2 className="text-3xl font-headline font-bold text-[var(--color-on-surface)]">Estudiantes</h2>
          
          {students.length === 0 ? (
            <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center border border-[var(--color-outline-variant)]">
              <span className="material-symbols-outlined text-5xl text-[var(--color-on-surface-variant)] mb-4">group_off</span>
              <p className="text-[var(--color-on-surface-variant)] text-lg">No hay estudiantes inscritos.</p>
            </div>
          ) : (
            <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-6 border border-[var(--color-outline-variant)] flex flex-col gap-4">
              {students.map((student) => (
                <div key={student.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[var(--color-surface-container)] transition-colors">
                  <div className="h-12 w-12 rounded-full border border-[var(--color-outline-variant)] overflow-hidden shrink-0">
                    <img 
                      src={student.avatar ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/_pb_users_auth_/${student.id}/${student.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || "User")}&background=3fff8b&color=0e0e0e`} 
                      alt={student.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-[var(--color-on-surface)] truncate">{student.name} {student.lastName}</p>
                    {student.email ? (
                      <p className="text-sm text-[var(--color-on-surface-variant)] truncate">{student.email}</p>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-[var(--color-on-surface-variant)]/70 truncate" title="Para ver el email, el usuario debe tener 'emailVisibility' activado en PocketBase">
                        <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                        <span className="italic">Email oculto</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
