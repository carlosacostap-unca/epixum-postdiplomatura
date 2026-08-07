import { redirect } from "next/navigation";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { getClass, getCourse, getCourseWeeks } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import EditClassForm from "./EditClassForm";

export default async function EditClassPage({ params }: { params: Promise<{ id: string; classId: string }> }) {
  const { id, classId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "docente") redirect("/");
  const [course, classData] = await Promise.all([getCourse(id), getClass(classId)]);
  if (!course?.teachers?.includes(user.id) || classData.course !== course.id) redirect("/docentes");
  const weeks = course.organizationMode === "semanal" ? await getCourseWeeks(course.id) : [];

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <TeacherCourseContext course={course} current="clases" title={`Editar ${classData.title}`} description="Actualizá la información y la programación de esta clase." />
    <EditClassForm courseId={course.id} classData={classData} weeks={weeks} />
  </div>;
}
