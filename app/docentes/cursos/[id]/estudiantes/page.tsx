import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { StudentProgressDashboard } from '@/components/course/StudentProgressDashboard';
import { getStudentProgress } from '@/lib/student-progress-data';
import { parseProgressFilters } from '@/lib/student-progress';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params; const filters = parseProgressFilters(await searchParams);
  const data = await getStudentProgress(id);
  return <div className="page-container space-y-8"><TeacherCourseContext course={data.course} current="estudiantes" title="Seguimiento de estudiantes" description="Preparación, actividad y resultados de parciales de las matrículas vigentes." /><StudentProgressDashboard data={data} filters={filters} /></div>;
}
