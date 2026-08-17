import { notFound, redirect } from 'next/navigation';
import { CourseContentForm } from '@/components/course/CourseContentForm';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { Card, CardContent } from '@/components/ui';
import { getCourseContentWithResources } from '@/lib/course-content-data';
import { getCourse } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function EditCourseContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const { id, contentId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'docente') redirect('/');
  const course = await getCourse(id);
  if (!course?.contentsEnabled || !course.teachers?.includes(user.id)) redirect(`/docentes/cursos/${id}`);
  const result = await getCourseContentWithResources(course.id, contentId);
  if (!result) notFound();

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <TeacherCourseContext course={course} current="contenidos" title={`Editar ${result.content.title}`} description="Actualizá el título o la descripción sin cambiar su posición." />
    <Card><CardContent><CourseContentForm courseId={course.id} content={result.content} /></CardContent></Card>
  </div>;
}
