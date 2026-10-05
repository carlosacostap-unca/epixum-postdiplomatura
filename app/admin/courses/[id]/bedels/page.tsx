import CourseBedelManager from '@/components/CourseBedelManager';
import { getCourseBedels } from '@/lib/course-bedel-data';

export default async function CourseBedelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseBedelManager courseId={id} bedels={await getCourseBedels(id)} />;
}
