import { redirect } from "next/navigation";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { Card, CardContent } from "@/components/ui";
import { getCourse, getCourseWeeks } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import NewClassForm from "./NewClassForm";

export default async function NewClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ semana?: string }> }) {
  const { id } = await params;
  const { semana } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const course = await getCourse(id);
  if (!course?.teachers?.includes(user.id)) redirect("/docentes");
  const weeks = course.organizationMode === "semanal" ? await getCourseWeeks(course.id) : [];

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <TeacherCourseContext course={course} current="clases" title="Programar nueva clase" description={`Añadí una nueva sesión a ${course.title}.`} />
    <Card className="max-w-3xl"><CardContent><NewClassForm courseId={course.id} weeks={weeks} initialWeekId={semana} /></CardContent></Card>
  </div>;
}
