import type { CourseInvitationStatus } from '@/types';
import { getCourse, getCourseInvitations } from '@/lib/data';
import { notFound } from 'next/navigation';
import CourseAccessSettings from '@/components/CourseAccessSettings';
import CourseKeyManager from '@/components/CourseKeyManager';
import CourseInvitationManager from '@/components/CourseInvitationManager';

export default async function CourseAccessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ invitaciones?: string; pagina?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const course = await getCourse(id).catch(() => null);
  if (!course) notFound();
  const invitationStatus = ['pendiente', 'activada', 'revocada'].includes(query.invitaciones || '') ? query.invitaciones as CourseInvitationStatus : undefined;
  const invitationPageNumber = Math.max(1, Number(query.pagina) || 1);
  const invitationPage = await getCourseInvitations(course.id, invitationPageNumber, invitationStatus);
  const basePath = `/admin/courses/${course.id}/access`;

  return (
    <div className="space-y-8">
      <CourseAccessSettings courseId={course.id} initialMode={course.enrollmentMode || 'clave'} />
      <CourseKeyManager courseId={course.id} enrollmentMode={course.enrollmentMode || 'clave'} />
      <CourseInvitationManager courseId={course.id} basePath={basePath} enabled={course.enrollmentMode === 'invitacion_contrasena'} invitations={invitationPage.items} page={invitationPage.page} totalPages={invitationPage.totalPages} status={invitationStatus} />
    </div>
  );
}
