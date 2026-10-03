import { getCourse, getCourseWeeks } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import NuevoTpForm from "./NuevoTpForm";

export const dynamic = 'force-dynamic';

export default async function NuevoTpPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ semana?: string }> }) {
  const params = await props.params;
  const { semana } = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourse(params.id);
  if (!course?.teachers?.includes(user.id)) redirect("/docentes");
  const weeks = course.organizationMode === "semanal" ? await getCourseWeeks(course.id) : [];

  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="trabajos" title="Crear trabajo práctico" description="Definí el enunciado, los recursos y la fecha de entrega." />
    <NuevoTpForm courseId={course.id} weeks={weeks} initialWeekId={semana} />
  </div>;
}
