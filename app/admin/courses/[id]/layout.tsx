import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/data";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import CourseAdminNavigation from "@/components/CourseAdminNavigation";
import DeleteCourseButton from "./DeleteCourseButton";

export default async function CourseAdminLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id).catch(() => null);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10 xl:p-12">
      <Breadcrumbs items={[{ href: "/admin/courses", label: "Cursos" }, { label: course.title }]} />
      <PageHeader className="mt-6" eyebrow="Administración del curso" title={course.title} description="Configurá el curso, sus participantes y la forma de acceso desde un mismo lugar." actions={<DeleteCourseButton id={course.id} title={course.title} />} />
      <div className="mt-8"><CourseAdminNavigation courseId={course.id} /></div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
