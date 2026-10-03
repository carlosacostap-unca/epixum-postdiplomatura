import { Card, CardContent } from '@/components/ui';
import { InteractiveLessonForm } from '@/components/course/InteractiveLessonForm';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { getInteractiveCourse } from '@/lib/interactive-class-data';
import { getClassesByCourse } from '@/lib/data';

export default async function NewInteractiveLessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ clase?: string }> }) {
  const { id } = await params;
  const { clase } = await searchParams;
  const course = await getInteractiveCourse(id);
  const classes = await getClassesByCourse(id);
  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="interactivas" title="Nueva clase interactiva" description="Podés empezar con un borrador y completar el material y la asociación más adelante." />
    <Card><CardContent><InteractiveLessonForm courseId={id} classes={classes} initialClassId={classes.some((item) => item.id === clase) ? clase : ''} /></CardContent></Card>
  </div>;
}
