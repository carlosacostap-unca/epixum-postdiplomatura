import { redirect } from "next/navigation";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { Card, CardContent } from "@/components/ui";
import { getClass, getCourse } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import NewResourceForm from "./NewResourceForm";

export default async function TeacherNewResourcePage({ params }: { params: Promise<{ id: string; classId: string }> }) {
  const { id, classId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [course, classData] = await Promise.all([getCourse(id), getClass(classId)]);
  if (!course?.teachers?.includes(user.id) || classData.course !== course.id) redirect("/docentes");

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <TeacherCourseContext course={course} current="clases" title="Añadir recurso" description={`Material para ${classData.title}.`} />
    <Card className="max-w-3xl"><CardContent><NewResourceForm courseId={course.id} classId={classData.id} /></CardContent></Card>
  </div>;
}
