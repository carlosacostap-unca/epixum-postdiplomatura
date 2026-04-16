import { createServerClient, getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import { Course, Class } from "@/types";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";

export const dynamic = 'force-dynamic';

export default async function DocenteClasesPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const pb = await createServerClient();
  let courses: Course[] = [];
  let coursesWithClasses: { course: Course, classes: Class[] }[] = [];
  
  try {
    courses = await pb.collection("courses").getFullList<Course>({
      filter: `teachers ~ "${user.id}"`,
      sort: "-created",
      requestKey: null,
    });

    // Fetch classes for each course
    coursesWithClasses = await Promise.all(courses.map(async (course) => {
      let classes: Class[] = [];
      try {
        classes = await pb.collection("classes").getFullList<Class>({
          filter: `course = "${course.id}"`,
          sort: "-date",
          requestKey: null,
        });
      } catch (e) {
        console.error(`Error fetching classes for course ${course.id}:`, e);
      }
      return { course, classes };
    }));
  } catch (error) {
    console.error("Error fetching courses with classes:", error);
  }

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto w-full h-full">
      <header className="mb-12 md:mb-24 flex flex-col md:flex-row gap-10 md:gap-20 items-start justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
              Panel Docente
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-headline tracking-tight text-[var(--color-on-surface)] mb-6">
            Gestionar <span className="text-[var(--color-primary)]">Clases</span>
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-lg md:text-xl leading-relaxed">
            Administra las clases de los cursos que tienes asignados. Selecciona un curso para ver y gestionar sus clases.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-12">
        {coursesWithClasses.length === 0 ? (
          <div className="bg-[var(--color-surface-container-low)] rounded-[3rem] p-16 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-6xl opacity-50 mb-6">school</span>
            <p className="text-[var(--color-on-surface-variant)] text-lg">No tienes cursos asignados actualmente.</p>
          </div>
        ) : (
          coursesWithClasses.map(({ course, classes }) => {
            // Ordenar las clases por fecha (más recientes primero)
            const sortedClasses = [...classes].sort((a, b) => {
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            return (
              <div key={course.id} className="bg-[var(--color-surface-container-low)] rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 md:pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-headline font-semibold text-[var(--color-on-surface)]">{course.title}</h2>
                    <p className="text-base text-[var(--color-on-surface-variant)] mt-2">
                      {classes.length} {classes.length === 1 ? 'clase' : 'clases'}
                    </p>
                  </div>
                  <Link 
                    href={`/docentes/cursos/${course.id}`}
                    className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-[#000000] rounded-full hover:opacity-90 transition-opacity font-medium text-base whitespace-nowrap shadow-[0_0_20px_rgba(63,255,139,0.2)]"
                    title="Gestionar Curso"
                  >
                    <span className="material-symbols-outlined text-lg">visibility</span>
                    Gestionar Curso
                  </Link>
                </div>

                <div className="p-4 pt-0">
                  {sortedClasses.length === 0 ? (
                    <div className="p-12 text-center text-[var(--color-on-surface-variant)] text-lg bg-[var(--color-surface-container)] rounded-[2rem] mx-4 mb-4">
                      No hay clases registradas en este curso.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-[var(--color-surface-container)] rounded-[2rem] mx-4 mb-4">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="border-b border-transparent">
                            <th className="px-8 py-6 font-headline font-semibold text-sm text-[var(--color-on-surface-variant)] uppercase tracking-wider">Título</th>
                            <th className="px-8 py-6 font-headline font-semibold text-sm text-[var(--color-on-surface-variant)] uppercase tracking-wider">Fecha</th>
                            <th className="px-8 py-6 font-headline font-semibold text-sm text-[var(--color-on-surface-variant)] uppercase tracking-wider text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                          {sortedClasses.map((cls) => (
                            <tr key={cls.id} className="hover:bg-[var(--color-surface-container-highest)] transition-colors group">
                              <td className="px-8 py-6">
                                <div className="font-medium text-lg text-[var(--color-on-surface)]">
                                  {cls.title}
                                </div>
                                {cls.description && (
                                  <div className="text-sm text-[var(--color-on-surface-variant)] truncate max-w-md mt-2" dangerouslySetInnerHTML={{__html: cls.description.substring(0, 100) + (cls.description.length > 100 ? '...' : '')}} />
                                )}
                              </td>
                              <td className="px-8 py-6">
                                <div className="text-base text-[var(--color-on-surface-variant)]">
                                  {cls.date ? <FormattedDate date={cls.date} showTime={true} /> : 'Sin fecha'}
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <Link 
                                  href={`/docentes/cursos/${course.id}/clases/${cls.id}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--color-surface-container-highest)] text-[var(--color-primary)] hover:bg-gradient-to-br hover:from-[var(--color-primary)] hover:to-[var(--color-primary-container)] hover:text-[#000000] hover:shadow-[0_0_20px_rgba(63,255,139,0.2)] hover:scale-[1.05] active:scale-95 transition-all"
                                >
                                  Ver detalles
                                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
