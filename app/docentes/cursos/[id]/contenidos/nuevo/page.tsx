import { redirect } from 'next/navigation';
import { CourseContentForm } from '@/components/course/CourseContentForm';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { Card, CardContent } from '@/components/ui';
import { getCourse } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function NewCourseContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const course = await getCourse(id);
  if (!course?.contentsEnabled || !course.teachers?.includes(user.id)) redirect(`/docentes/cursos/${id}`);

  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="contenidos" title="Nuevo contenido" description="Creá un material visible inmediatamente para los estudiantes matriculados." />
    <Card><CardContent><CourseContentForm courseId={course.id} /></CardContent></Card>
  </div>;
}
