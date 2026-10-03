import { getAssignment, getCourse, getDeliveryById } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import { Badge, Breadcrumbs, Card, CardContent, PageHeader } from "@/components/ui";
import { teacherDeliveryPresentation } from "@/lib/delivery-presentation";
import DownloadButtonClient from './DownloadButtonClient';
import AIPreevaluationClient from './AIPreevaluationClient';
import Image from "next/image";
import { isGithubDeliverySubmission, parseDeliverySubmission } from "@/types";
import { getAssignmentAIConfig } from "@/lib/actions-ai-config";
import { assignmentAIConfigInputSchema } from "@/lib/ai-preevaluation-schema";
import { getAIPreevaluationProviderStatus, getLatestAIPreevaluation } from "@/app/actions/openai";
import { parseGithubRepositoryUrl } from "@/lib/github-url";
import { isAdmin, isAssignedTeacher } from "@/lib/course-roles";
import { normalizeDeliveryWorkflow } from "@/lib/delivery-workflow";

export const dynamic = 'force-dynamic';

export default async function DeliveryDetailsPage({ params }: { params: Promise<{ id: string, deliveryId: string }> }) {
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
    additionalInstructions: aiConfig.additionalInstructions,
  }) : null;
  const githubCandidate = submission.type === 'url' ? parseGithubRepositoryUrl(submission.url) : null;
  const aiEligible = Boolean(course.aiPreevaluationEnabled && configValidation?.success && configValidation.data.active && githubCandidate);
  const initialAttempt = aiEligible ? await getLatestAIPreevaluation(delivery.id).catch(() => null) : null;

  const workflow = normalizeDeliveryWorkflow(delivery);
  const presentation = teacherDeliveryPresentation(delivery);
  const backHref = !isAdmin(user) ? `/docentes/cursos/${course.id}/tps/${id}#entregas` : `/admin/courses/${course.id}`;
  const studentName = student?.name || [student?.firstName, student?.lastName].filter(Boolean).join(" ") || "Estudiante";

  return <div className="page-container max-w-6xl space-y-6">
    <Breadcrumbs items={[{ href: backHref, label: assignment.title }, { label: "Revisar entrega" }]} />
    <PageHeader eyebrow="Revisión docente" title="Revisar entrega" description={assignment.title} metadata={<><Badge tone={presentation.tone}>{presentation.label}</Badge><Badge>Versión {workflow.submissionVersion}</Badge></>} actions={<Link href={backHref} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-highest)] px-4 text-sm font-semibold"><span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>Volver</Link>} />
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardContent className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)]">Estudiante y entrega</h2>
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)]">{student?.avatar ? <Image unoptimized src={`${pbUrl}/api/files/${student.collectionId}/${student.id}/${student.avatar}`} alt="" width={48} height={48} className="size-12 object-cover" /> : studentName.charAt(0)}</span>
          <div className="min-w-0"><p className="font-semibold">{studentName}</p><p className="break-all text-sm text-[var(--color-on-surface-variant)]">{student?.email}</p></div>
        </div>
        <p className="text-sm text-[var(--color-on-surface-variant)]">Enviada el <FormattedDate date={workflow.submittedAt} showTime /></p>
      </CardContent></Card>
      <Card><CardContent className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)]">{submission.type === "url" ? "Enlace entregado" : "Archivos entregados"}</h2>
        <div className="flex min-w-0 items-start gap-3"><span className="material-symbols-outlined shrink-0 text-[var(--color-primary)]" aria-hidden="true">{submission.type === "url" ? "link" : "description"}</span><p className="min-w-0 break-all text-sm">{submission.type === "url" ? submission.url : `${submission.files.length} ${submission.files.length === 1 ? "archivo" : "archivos"}`}</p></div>
        {submission.type === "url" ? <a href={submission.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-highest)] px-4 text-sm font-semibold"><span className="material-symbols-outlined text-lg" aria-hidden="true">open_in_new</span>Abrir enlace</a> : <DownloadButtonClient deliveryId={delivery.id} />}
      </CardContent></Card>
    </div>
          <AIPreevaluationClient
            deliveryId={delivery.id}
            submissionVersion={normalizeDeliveryWorkflow(delivery).submissionVersion}
            aiEligible={aiEligible}
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
  </div>;
}
