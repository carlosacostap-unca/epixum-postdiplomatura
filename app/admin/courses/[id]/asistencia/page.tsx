import { notFound } from 'next/navigation';
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
  return <div className="space-y-6"><h2 className="text-2xl font-bold">Asistencia del curso</h2><AttendanceSheet courseId={id} enabled={Boolean(data.course.attendanceEnabled)} report={data.report} /></div>;
}
