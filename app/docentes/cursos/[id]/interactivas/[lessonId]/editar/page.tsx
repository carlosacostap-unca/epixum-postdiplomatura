import { Card, CardContent } from '@/components/ui';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { InteractiveLessonForm } from '@/components/course/InteractiveLessonForm';
import { getInteractiveCourse, getInteractiveLesson } from '@/lib/interactive-class-data';
import { getClassesByCourse } from '@/lib/data';

export default async function EditInteractiveLessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const course = await getInteractiveCourse(id);
  const [lesson, classes] = await Promise.all([getInteractiveLesson(id, lessonId), getClassesByCourse(id)]);
  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="interactivas" title="Editar clase interactiva" description={lesson.title} />
    <Card><CardContent><InteractiveLessonForm courseId={id} lesson={lesson} classes={classes} /></CardContent></Card>
  </div>;
}
