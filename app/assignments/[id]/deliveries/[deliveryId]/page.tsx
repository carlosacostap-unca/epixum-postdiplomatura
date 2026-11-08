import { getAssignment, getCourse, getDeliveries, getDeliveryById } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import DeliveryTimingBadge from '@/components/DeliveryTimingBadge';
import { Badge, Breadcrumbs, Card, CardContent, PageHeader } from "@/components/ui";
import { teacherDeliveryPresentation } from "@/lib/delivery-presentation";
import AIPreevaluationClient from './AIPreevaluationClient';
import Image from "next/image";
import { isGithubDeliverySubmission, parseDeliverySubmission } from "@/types";
import { getAssignmentAIConfig } from "@/lib/actions-ai-config";
import { assignmentAIConfigInputSchema } from "@/lib/ai-preevaluation-schema";
import { getAIPreevaluationProviderStatus, getLatestAIPreevaluation } from "@/app/actions/openai";
import { parseGithubRepositoryUrl } from "@/lib/github-url";
import { isAdmin, isAssignedTeacher } from "@/lib/course-roles";
import { normalizeDeliveryWorkflow } from "@/lib/delivery-workflow";
import { isDocumentSubmission } from '@/lib/document-submission';
import { deliveryReviewHref, parseReviewContext, reviewQueue, reviewSearch, type ReviewSearchParams } from '@/lib/teacher-review';
import ReviewWorkspace from '@/components/teacher/ReviewWorkspace';
import DeliveryMaterial from '@/components/teacher/DeliveryMaterial';

export const dynamic = 'force-dynamic';

export default async function DeliveryDetailsPage({ params, searchParams }: { params: Promise<{ id: string, deliveryId: string }>; searchParams: Promise<ReviewSearchParams> }) {
  const { id, deliveryId } = await params;
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  const assignment = await getAssignment(id);
  const delivery = await getDeliveryById(deliveryId);

  if (!assignment || !delivery || delivery.assignment !== assignment.id) {
    return notFound();
  }

  if (!assignment.course) redirect(isAdmin(user) ? "/admin" : "/docentes");
  const course = await getCourse(assignment.course).catch(() => null);
  if (!course) return notFound();
  if (!isAdmin(user) && !isAssignedTeacher(course, user.id)) redirect("/docentes");
  const reviewContext = parseReviewContext(await searchParams);
  const queue = reviewQueue(await getDeliveries(assignment.id), assignment.id, delivery.id, reviewContext);
  const currentIndex = queue.findIndex(item => item.id === delivery.id);
  const navigationLink = (index: number) => {
    const item = queue[index];
    if (!item) return undefined;
    const person = item.expand?.student;
    return { href: deliveryReviewHref(assignment.id, item.id, reviewContext), student: [person?.firstName || person?.name, person?.lastName].filter(Boolean).join(' ') || 'Estudiante' };
  };

  const student = delivery.expand?.student;
  const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, "") || "";
  const submission = parseDeliverySubmission(delivery.repositoryUrl);
  const [aiConfig, providerStatus] = await Promise.all([
    getAssignmentAIConfig(assignment.id).catch(() => null),
    getAIPreevaluationProviderStatus(),
  ]);
  const configValidation = aiConfig ? assignmentAIConfigInputSchema.safeParse({
    active: aiConfig.active,
    criteria: aiConfig.criteria,
    requiredChecks: aiConfig.requiredChecks,
    allowedVerdicts: aiConfig.allowedVerdicts,
    gradeEnabled: aiConfig.gradeEnabled,
    gradeMin: aiConfig.gradeMin,
    gradeMax: aiConfig.gradeMax,
    messageGuidance: aiConfig.messageGuidance,
    studentFeedbackMode: aiConfig.studentFeedbackMode,
    additionalInstructions: aiConfig.additionalInstructions,
  }) : null;
  const githubCandidate = submission.type === 'url' ? parseGithubRepositoryUrl(submission.url) : null;
  const documents = isDocumentSubmission(submission);
  const aiEligible = Boolean(course.aiPreevaluationEnabled && configValidation?.success && configValidation.data.active && (githubCandidate || documents));
  const initialAttempt = aiEligible ? await getLatestAIPreevaluation(delivery.id).catch(() => null) : null;

  const workflow = normalizeDeliveryWorkflow(delivery);
  const presentation = teacherDeliveryPresentation(delivery);
  const backHref = !isAdmin(user) ? `/docentes/cursos/${course.id}/tps/${id}${reviewSearch(reviewContext)}#entregas` : `/admin/courses/${course.id}`;
  const studentName = [student?.firstName || student?.name, student?.lastName].filter(Boolean).join(" ") || "Estudiante";

  return <div className="page-container space-y-6">
    <ReviewWorkspace key={`${delivery.id}:${workflow.submissionVersion}`} backHref={backHref} previous={currentIndex > 0 ? navigationLink(currentIndex - 1) : undefined} next={currentIndex >= 0 ? navigationLink(currentIndex + 1) : undefined} position={currentIndex + 1} total={queue.length} filtered={Boolean(reviewContext.query || reviewContext.filter !== 'all')}>
      <Breadcrumbs items={[{ href: isAdmin(user) ? `/admin/courses/${course.id}` : `/docentes/cursos/${course.id}`, label: course.title }, { href: backHref, label: assignment.title }, { label: studentName }]} />
      <PageHeader eyebrow="Revisión docente" title={studentName} description={assignment.title} metadata={<><Badge tone={presentation.tone}>{presentation.label}</Badge><Badge>Versión {workflow.submissionVersion}</Badge></>} />
      <AIPreevaluationClient
        key={`${delivery.id}:${workflow.submissionVersion}`}
        submission={<Card><CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)]">{student?.avatar ? <Image unoptimized src={`${pbUrl}/api/files/${student.collectionId}/${student.id}/${student.avatar}`} alt="" width={48} height={48} className="size-12 object-cover" /> : studentName.charAt(0)}</span>
          <div className="min-w-0"><p className="font-semibold">{studentName}</p><p className="break-all text-sm text-[var(--color-on-surface-variant)]">{student?.email}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-[var(--color-on-surface-variant)]">Enviada el <FormattedDate date={workflow.submittedAt} showTime /></p><DeliveryTimingBadge delivery={delivery} dueDate={assignment.dueDate} /></div>
        <DeliveryMaterial delivery={delivery} dueDate={assignment.dueDate} />
      </CardContent></Card>}
            deliveryId={delivery.id}
            submissionVersion={normalizeDeliveryWorkflow(delivery).submissionVersion}
            aiEligible={aiEligible}
            sourceType={documents ? 'documents' : 'github'}
            repositoryUrl={submission.type === 'url' ? submission.url : undefined}
            repositoryFullName={isGithubDeliverySubmission(submission) ? submission.repositoryFullName : githubCandidate?.fullName}
            commitSha={isGithubDeliverySubmission(submission) ? submission.commitSha : undefined}
            captureSource={isGithubDeliverySubmission(submission) ? submission.captureSource : undefined}
            providerStatus={providerStatus}
            initialAttempt={initialAttempt}
            initialGrade={delivery.grade}
            initialFeedback={delivery.feedback}
            initialVerdict={delivery.verdict}
            initialStatus={delivery.status}
          />
    </ReviewWorkspace>
  </div>;
}
