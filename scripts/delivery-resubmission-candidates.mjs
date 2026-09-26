const CANDIDATE_WINDOW_MS = 2 * 60 * 1000;

function githubStudentUpdate(repositoryUrl) {
  try {
    const parsed = JSON.parse(repositoryUrl);
    if (
      parsed?.type === 'url'
      && parsed.provider === 'github'
      && parsed.captureSource === 'student-update'
      && typeof parsed.commitCapturedAt === 'string'
      && Number.isFinite(Date.parse(parsed.commitCapturedAt))
    ) return parsed;
  } catch { /* Una entrega heredada puede no ser JSON. */ }
  return null;
}

export function legacyResubmissionCandidate(delivery, windowMs = CANDIDATE_WINDOW_MS) {
  if (delivery.status !== 'published' || delivery.verdict !== 'Corregir y reenviar') return false;
  if (Number(delivery.resubmissionCount || 0) > 0 || Number(delivery.submissionVersion || 1) > 1) return false;
  const submission = githubStudentUpdate(delivery.repositoryUrl);
  if (!submission) return false;
  const captureTime = Date.parse(submission.commitCapturedAt);
  const updatedTime = Date.parse(delivery.updated);
  return Number.isFinite(updatedTime) && Math.abs(updatedTime - captureTime) <= windowMs;
}

function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function confirmedLegacyResubmissionPatch(delivery) {
  if (!legacyResubmissionCandidate(delivery)) {
    throw new Error(`La entrega ${delivery.id || '(sin id)'} no cumple los criterios conservadores de reenvío histórico.`);
  }
  const submission = githubStudentUpdate(delivery.repositoryUrl);
  const history = Array.isArray(delivery.history) ? delivery.history : [];
  const evaluation = {
    ...(typeof delivery.grade === 'number' && Number.isFinite(delivery.grade) ? { grade: delivery.grade } : {}),
    feedback: String(delivery.feedback || ''),
    verdict: 'Corregir y reenviar',
    ...(validDate(delivery.evaluatedAt) && delivery.evaluatedAt !== delivery.updated ? { evaluatedAt: delivery.evaluatedAt } : {}),
  };
  return {
    status: 'pending',
    grade: null,
    feedback: '',
    verdict: '',
    submissionVersion: 2,
    evaluatedVersion: 1,
    submittedAt: submission.commitCapturedAt,
    evaluatedAt: '',
    resubmissionCount: 1,
    history: [...history, {
      version: 1,
      submittedAt: validDate(delivery.submittedAt) ? delivery.submittedAt : delivery.created,
      contentUnavailable: true,
      evaluation,
    }],
  };
}

export function candidateSummary(delivery) {
  const submission = githubStudentUpdate(delivery.repositoryUrl);
  const student = delivery.expand?.student;
  const assignment = delivery.expand?.assignment;
  return {
    deliveryId: delivery.id,
    assignmentId: delivery.assignment,
    assignment: assignment?.title || undefined,
    studentId: delivery.student,
    student: [student?.firstName || student?.name, student?.lastName].filter(Boolean).join(' ') || undefined,
    email: student?.email || undefined,
    capturedAt: submission?.commitCapturedAt,
    repository: submission?.repositoryFullName,
  };
}
