import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AssignmentAIConfigPanel from '@/app/docentes/cursos/[id]/tps/[tpId]/AssignmentAIConfigPanel';
import { PageHeader } from '@/components/ui';
import { getAssignmentAIConfig } from '@/lib/actions-ai-config';
import { emptyAssignmentAIConfig } from '@/lib/assignment-ai-config';
import { isAdmin } from '@/lib/course-roles';
import { getAssignment, getCourse } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function AutomationConfigPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  if (!isAdmin(await getCurrentUser())) redirect('/');
  const { assignmentId } = await params;
  const assignment = await getAssignment(assignmentId);
  if (!assignment?.course) notFound();
  const [course, config] = await Promise.all([getCourse(assignment.course), getAssignmentAIConfig(assignmentId)]);
  if (!course) notFound();
  return <div className="page-container space-y-6">
    <Link href="/admin/automatizaciones" className="text-sm font-semibold hover:underline">Volver al centro de automatizaciones</Link>
    <PageHeader title={assignment.title} description={course.title} />
    <AssignmentAIConfigPanel assignmentId={assignmentId} courseEnabled={Boolean(course.aiPreevaluationEnabled)} initialConfig={config || emptyAssignmentAIConfig()} />
  </div>;
}
