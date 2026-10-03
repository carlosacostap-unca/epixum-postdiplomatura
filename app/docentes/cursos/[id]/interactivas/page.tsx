import Link from 'next/link';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { InteractiveLessonList, interactiveLinkClass } from '@/components/course/InteractiveLessonList';
import { getInteractiveCourse, getInteractiveLessons } from '@/lib/interactive-class-data';

export default async function CourseInteractiveLessonsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; clase?: string }> }) {
  const { id } = await params;
  const { p, clase } = await searchParams;
  const course = await getInteractiveCourse(id);
  const result = await getInteractiveLessons({ courseId: id, classId: clase, page: Number(p) || 1 });
  const base = `/docentes/cursos/${id}/interactivas`;
  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="interactivas" title="Clases interactivas" description="Prepará el material y vinculalo a una clase del curso. La preparación es privada para docentes." actions={<Link href={`${base}/nueva${clase ? `?clase=${encodeURIComponent(clase)}` : ''}`} className={interactiveLinkClass}>Nueva clase interactiva</Link>} />
    {clase && <Link href={base} className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">Ver todas las clases interactivas del curso</Link>}
    <InteractiveLessonList result={result} basePath={`${base}${clase ? `?clase=${encodeURIComponent(clase)}` : ''}`} />
  </div>;
}
