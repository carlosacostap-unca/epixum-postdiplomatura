import { redirect } from 'next/navigation';
import { CourseContentForm } from '@/components/course/CourseContentForm';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { Card, CardContent } from '@/components/ui';
import { getCourse } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function NewCourseContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'docente') redirect('/');
  const course = await getCourse(id);
  if (!course?.contentsEnabled || !course.teachers?.includes(user.id)) redirect(`/docentes/cursos/${id}`);

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <TeacherCourseContext course={course} current="contenidos" title="Nuevo contenido" description="Creá un material visible inmediatamente para los estudiantes matriculados." />
    <Card><CardContent><CourseContentForm courseId={course.id} /></CardContent></Card>
  </div>;
}
