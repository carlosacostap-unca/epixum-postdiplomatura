import CourseForm from '@/components/CourseForm';
import { getUsers, getAllClasses, getAllAssignments } from '@/lib/data';
import { getInquiries } from '@/lib/actions-inquiries';
import { Breadcrumbs, Card, PageHeader } from '@/components/ui';

export default async function NewCoursePage() {
  const users = await getUsers();
  const classes = await getAllClasses();
  const assignments = await getAllAssignments();
  const inquiries = await getInquiries();
  
  const teachers = users;

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10 xl:p-12">
      <Breadcrumbs items={[{ href: '/admin/courses', label: 'Cursos' }, { label: 'Nuevo curso' }]} />
      <PageHeader className="mt-6" eyebrow="Administración" title="Crear curso" description="Definí la información, docentes y acceso inicial." />
      <Card className="mt-8 overflow-hidden">
        <CourseForm 
          teachers={teachers} 
          availableClasses={classes} 
          availableAssignments={assignments} 
          availableInquiries={inquiries}
        />
      </Card>
    </div>
  );
}
