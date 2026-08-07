import CourseForm from '@/components/CourseForm';
import { getCourse, getUsers, getAllClasses, getAllAssignments, getCourseInvitations } from '@/lib/data';
import { getInquiries } from '@/lib/actions-inquiries';
import { notFound } from 'next/navigation';
import DeleteCourseButton from './DeleteCourseButton';
import { Breadcrumbs, Card, PageHeader } from '@/components/ui';
import CourseKeyManager from '@/components/CourseKeyManager';
import CourseInvitationManager from '@/components/CourseInvitationManager';
import type { CourseInvitationStatus } from '@/types';

export default async function EditCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ invitaciones?: string; pagina?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const course = await getCourse(id);
  
  if (!course) {
    notFound();
  }

  const users = await getUsers();
  const classes = await getAllClasses();
  const assignments = await getAllAssignments();
  const inquiries = await getInquiries();
  const invitationStatus = ['pendiente', 'activada', 'revocada'].includes(query.invitaciones || '') ? query.invitaciones as CourseInvitationStatus : undefined;
  const invitationPageNumber = Math.max(1, Number(query.pagina) || 1);
  const invitationPage = await getCourseInvitations(course.id, invitationPageNumber, invitationStatus);
  
  const teachers = users.filter(u => u.role === 'docente' || u.role === 'admin');

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 xl:p-12">
      <Breadcrumbs items={[{ href: '/admin/courses', label: 'Cursos' }, { label: course.title }]} />
      <PageHeader className="mt-6" eyebrow="Administración" title={`Editar ${course.title}`} description="Actualizá el curso o eliminá el registro si ya no corresponde." actions={<DeleteCourseButton id={course.id} title={course.title} />} />
      <Card className="mt-8 overflow-hidden">
        <CourseForm 
          course={course} 
          teachers={teachers}
          availableClasses={classes}
          availableAssignments={assignments}
          availableInquiries={inquiries}
        />
      </Card>
      <div className="mt-8">
        <CourseKeyManager courseId={course.id} enrollmentMode={course.enrollmentMode || 'clave'} />
      </div>
      <CourseInvitationManager courseId={course.id} enabled={course.enrollmentMode === 'invitacion_contrasena'} invitations={invitationPage.items} page={invitationPage.page} totalPages={invitationPage.totalPages} status={invitationStatus} />
    </div>
  );
}
