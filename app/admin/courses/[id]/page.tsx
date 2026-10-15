import CourseForm from '@/components/CourseForm';
import { getCourse, getAllClasses, getAllAssignments } from '@/lib/data';
import { getInquiries } from '@/lib/actions-inquiries';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui';
import AssignmentLatePolicyForm from '@/components/AssignmentLatePolicyForm';

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, classes, assignments, inquiries] = await Promise.all([
    getCourse(id).catch(() => null),
    getAllClasses(),
    getAllAssignments(),
    getInquiries(),
  ]);
  if (!course) notFound();

  return (
    <div className="space-y-6"><Card className="overflow-hidden">
      <CourseForm course={course} availableClasses={classes} availableAssignments={assignments} availableInquiries={inquiries} />
    </Card>
    <Card className="space-y-5 p-6"><div><h2 className="font-headline text-2xl font-bold">Plazos de los trabajos prácticos</h2><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Configurá cada trabajo sin modificar su vencimiento ni las evaluaciones existentes.</p></div>
      {assignments.filter(assignment => assignment.course === course.id).map(assignment => <section key={assignment.id} className="space-y-3 border-t border-[var(--color-outline-variant)] pt-5"><h3 className="font-bold">{assignment.title}</h3><AssignmentLatePolicyForm assignmentId={assignment.id} enabled={assignment.allowLateSubmissions} /></section>)}
    </Card></div>
  );
}
