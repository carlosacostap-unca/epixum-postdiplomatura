import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { StudentProgressDetail } from '@/components/course/StudentProgressDetail';
import { getStudentProgress } from '@/lib/student-progress-data';
import { parseProgressFilters } from '@/lib/student-progress';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; studentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id, studentId } = await params; const filters = parseProgressFilters(await searchParams);
  const data = await getStudentProgress(id, studentId);
  return <div className="page-container space-y-8"><TeacherCourseContext course={data.course} current="estudiantes" title={data.rows[0].name} description="Historial de preparación, parciales y devoluciones del estudiante." /><StudentProgressDetail data={data} filters={filters} /></div>;
}
