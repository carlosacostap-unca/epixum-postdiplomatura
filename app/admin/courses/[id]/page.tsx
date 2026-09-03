import CourseForm from '@/components/CourseForm';
import { getCourse, getAllClasses, getAllAssignments } from '@/lib/data';
import { getInquiries } from '@/lib/actions-inquiries';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui';

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
    <Card className="overflow-hidden">
      <CourseForm course={course} availableClasses={classes} availableAssignments={assignments} availableInquiries={inquiries} />
    </Card>
  );
}
