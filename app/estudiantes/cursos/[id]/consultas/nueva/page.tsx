import { redirect } from "next/navigation";
import NewInquiryForm from "@/components/NewInquiryForm";
import { StudentCourseContext } from "@/components/course/StudentCourseContext";
import { Card, CardContent } from "@/components/ui";
import { getClassesByCourse, getCourse, getCourseOrganizationData, isStudentEnrolled } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";

export const dynamic = "force-dynamic";

export default async function EstudianteNewInquiryPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ classId?: string; semana?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const course = await getCourse(id);
  if (!course || !(await isStudentEnrolled(course.id, user.id))) redirect("/estudiantes");

  const weekly = course.organizationMode === "semanal";
  const organization = weekly ? await getCourseOrganizationData(course) : null;
  const classes = organization?.classes || await getClassesByCourse(course.id);
  const weeks = organization?.weeks || [];
  const initialClassId = classes.some((item) => item.id === query.classId) ? query.classId : undefined;
  const initialWeekId = weeks.some((item) => item.id === query.semana) ? query.semana : undefined;

  return (
    <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
      <StudentCourseContext
        course={course}
        current="consultas"
        title="Nueva consulta"
        description={weekly ? "Elegí la semana y describí tu duda para que el curso pueda ayudarte." : "Describí tu duda para que el curso pueda ayudarte."}
      />
      <Card className="max-w-3xl">
        <CardContent>
          <NewInquiryForm
            courseId={course.id}
            classes={classes}
            weeks={weeks}
            weekly={weekly}
            initialClassId={initialClassId}
            initialWeekId={initialWeekId}
            basePath={`/estudiantes/cursos/${course.id}/consultas?autor=mis-consultas`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
