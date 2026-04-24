import { getCourse } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NuevoTpForm from "./NuevoTpForm";

export const dynamic = 'force-dynamic';

export default async function NuevoTpPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "docente") redirect("/");

  const course = await getCourse(params.id);
  if (!course) redirect("/docentes");

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full">
      <Link
        href={`/docentes/cursos/${course.id}`}
        className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors mb-8 md:mb-12 group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="font-bold text-sm tracking-widest uppercase">Volver al curso</span>
      </Link>

      <header className="mb-12">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
            Nuevo Trabajo Práctico
          </span>
          <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]">
            {course.title}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-headline tracking-tight text-[var(--color-on-surface)] leading-tight">
          Crear Trabajo Práctico
        </h1>
      </header>

      <NuevoTpForm courseId={course.id} />
    </div>
  );
}
