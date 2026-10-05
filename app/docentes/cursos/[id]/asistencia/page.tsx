import { notFound } from 'next/navigation';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { AttendanceSheet } from '@/components/attendance/AttendanceSheet';
import { getAttendanceReport } from '@/lib/course-attendance-data';
import { AttendanceAccessError } from '@/lib/course-attendance-service';
export const dynamic = 'force-dynamic';
export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAttendanceReport(id).catch(error => {
    if (error instanceof AttendanceAccessError) notFound();
    throw error;
  });
  return <div className="page-container space-y-8"><TeacherCourseContext course={data.course} current="asistencia" title="Asistencia del curso" description="Registro de ingresos en vivo y planilla por clase." /><AttendanceSheet courseId={id} enabled={Boolean(data.course.attendanceEnabled)} report={data.report} /></div>;
}
