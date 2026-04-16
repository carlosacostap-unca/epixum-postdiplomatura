import { getCourse, getClassesByCourse } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewInquiryForm from "@/components/NewInquiryForm";

export const dynamic = 'force-dynamic';

export default async function DocenteNewInquiryPage(props: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl flex flex-col gap-8 md:gap-12">
        <Link 
          href={`/docentes/cursos/${course.id}/consultas`} 
          className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors self-start group"
        >
          <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-bold text-sm tracking-widest uppercase">Volver al Foro</span>
        </Link>

        <div className="flex flex-col gap-4 text-center items-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-3xl">add_comment</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-headline tracking-tight text-[var(--color-on-surface)]">
            Nueva Consulta
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-lg">
            {course.title}
          </p>
        </div>

        <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-8 md:p-12 border border-[var(--color-outline-variant)] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 blur-[60px] -z-10 rounded-full pointer-events-none"></div>
          <NewInquiryForm courseId={course.id} classes={classes} basePath={`/docentes/cursos/${course.id}/consultas`} />
        </div>
      </div>
    </div>
  );
}