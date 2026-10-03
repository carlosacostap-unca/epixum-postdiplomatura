import { getCourse, getClassesByCourse } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { Card, CardContent } from "@/components/ui";
import NewInquiryForm from "@/components/NewInquiryForm";

export const dynamic = 'force-dynamic';

export default async function DocenteNewInquiryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourse(params.id);
  if (!course) {
    redirect("/docentes");
  }

  const classes = await getClassesByCourse(course.id);

  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="consultas" title="Nueva consulta" description="Abrí una conversación con las personas de este curso." />
    <Card className="max-w-3xl"><CardContent><NewInquiryForm courseId={course.id} classes={classes} basePath={`/docentes/cursos/${course.id}/consultas`} /></CardContent></Card>
  </div>;
}
