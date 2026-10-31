import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/data";
import { Badge, Breadcrumbs } from "@/components/ui";
import CourseAdminNavigation from "@/components/CourseAdminNavigation";
import DeleteCourseButton from "./DeleteCourseButton";

export default async function CourseAdminLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id).catch(() => null);
  if (!course) notFound();

  return (
    <div className="admin-course-layout">
      <CourseAdminNavigation courseId={course.id} courseTitle={course.title} outcomesEnabled={course.outcomesEnabled} surveysEnabled={course.surveysEnabled} onboardingEnabled={course.onboardingEnabled} interactiveClassesEnabled={course.interactiveClassesEnabled} preparationEnabled={course.preparationEnabled} examsEnabled={course.examsEnabled} />
      <div className="page-container admin-course-content">
        <div className="admin-course-context">
          <Breadcrumbs items={[{ href: "/admin", label: "Administración" }, { href: "/admin/courses", label: "Cursos" }, { label: course.title }]} />
          <div className="admin-course-context-actions">
            <Badge tone={course.status === "en curso" ? "success" : course.status === "borrador" ? "warning" : "neutral"}>{course.status}</Badge>
            <details className="admin-course-actions"><summary>Acciones<span className="material-symbols-outlined" aria-hidden="true">more_horiz</span></summary><div><DeleteCourseButton id={course.id} title={course.title} /></div></details>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
