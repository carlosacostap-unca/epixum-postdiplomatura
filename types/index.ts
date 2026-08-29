export interface BaseModel {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

export type UserRole = 'admin' | 'docente' | 'estudiante';
export type CourseOrganizationMode = 'tradicional' | 'semanal';
export type CourseEnrollmentMode = 'clave' | 'invitacion_contrasena';
export type CourseWeekStatus = 'borrador' | 'publicada' | 'programada';
export type CourseInvitationStatus = 'pendiente' | 'activada' | 'revocada';

export interface User extends BaseModel {
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  dni?: string;
  birthDate?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
}

export interface Link extends BaseModel {
  title: string;
  url: string;
  type?: 'link' | 'file';
  class?: string; // Relation to Class ID (optional, mutually exclusive with assignment/content)
  assignment?: string; // Relation to Assignment ID (optional, mutually exclusive with class/content)
  content?: string; // Relation to CourseContent ID (optional, mutually exclusive with class/assignment)
}

export interface Class extends BaseModel {
  title: string;
  description: string;
  date: string;
  course?: string; // Relation to Course ID
  week?: string; // Optional relation to CourseWeek ID
  // Expanding relations
  expand?: {
    links?: Link[];
    course?: Course;
    week?: CourseWeek;
  };
}

export interface Assignment extends BaseModel {
  title: string;
  description: string;
  dueDate?: string; // Adding dueDate as it might be useful without sprints
  systemPrompt?: string; // Prompt de sistema para preevaluación con IA
  course?: string; // Relation to Course ID
  week?: string; // Optional relation to CourseWeek ID
  // Expanding relations
  expand?: {
    links?: Link[];
    deliveries?: Delivery[];
    course?: Course;
    week?: CourseWeek;
  };
}

export interface DeliveryFile {
  name: string;
  url: string;
}

export type AIVerdict = 'Aprobado' | 'Desaprobado' | 'Corregir y reenviar';
export type GithubCaptureSource = 'student-submission' | 'student-update' | 'legacy-first-evaluation';

export interface GithubDeliverySnapshot {
  provider: 'github';
  repositoryFullName: string;
  commitSha: string;
  commitCapturedAt: string;
  captureSource: GithubCaptureSource;
}

export type DeliverySubmission =
  | { type: 'files'; files: DeliveryFile[] }
  | ({ type: 'url'; url: string } & Partial<GithubDeliverySnapshot>);

export type GithubDeliverySubmission = { type: 'url'; url: string } & GithubDeliverySnapshot;

export function isGithubDeliverySubmission(submission: DeliverySubmission): submission is GithubDeliverySubmission {
  return submission.type === 'url'
    && submission.provider === 'github'
    && typeof submission.repositoryFullName === 'string'
    && typeof submission.commitSha === 'string'
    && typeof submission.commitCapturedAt === 'string'
    && typeof submission.captureSource === 'string';
}

export interface Delivery extends BaseModel {
  assignment: string;
  student: string;
  repositoryUrl: string; // JSON DeliverySubmission data or a legacy file reference
  grade?: number;
  feedback?: string;
  verdict?: AIVerdict;
  status?: 'pending' | 'draft' | 'published';
  expand?: {
    student?: User;
  };
}

export function isValidDeliveryUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function serializeDeliveryUrl(value: string, github?: GithubDeliverySnapshot): string {
  const url = value.trim();
  if (!isValidDeliveryUrl(url)) {
    throw new Error('La URL debe ser absoluta y comenzar con http:// o https://');
  }
  return JSON.stringify({ type: 'url', url, ...github });
}

export function parseDeliverySubmission(repositoryUrl: string): DeliverySubmission {
  if (!repositoryUrl) return { type: 'files', files: [] };
  try {
    const parsed: unknown = JSON.parse(repositoryUrl);
    if (Array.isArray(parsed)) {
      const files = parsed.filter((item): item is DeliveryFile => (
        typeof item === 'object'
        && item !== null
        && typeof (item as DeliveryFile).name === 'string'
        && typeof (item as DeliveryFile).url === 'string'
      ));
      return { type: 'files', files };
    }
    if (
      typeof parsed === 'object'
      && parsed !== null
      && (parsed as { type?: unknown }).type === 'url'
      && typeof (parsed as { url?: unknown }).url === 'string'
      && isValidDeliveryUrl((parsed as { url: string }).url)
    ) {
      const candidate = parsed as Record<string, unknown>;
      const hasGithubSnapshot = candidate.provider === 'github'
        && typeof candidate.repositoryFullName === 'string'
        && /^[^/\s]+\/[^/\s]+$/.test(candidate.repositoryFullName)
        && typeof candidate.commitSha === 'string'
        && /^[a-f0-9]{40}$/i.test(candidate.commitSha)
        && typeof candidate.commitCapturedAt === 'string'
        && !Number.isNaN(Date.parse(candidate.commitCapturedAt))
        && ['student-submission', 'student-update', 'legacy-first-evaluation'].includes(String(candidate.captureSource));
      return hasGithubSnapshot
        ? {
            type: 'url',
            url: candidate.url as string,
            provider: 'github',
            repositoryFullName: candidate.repositoryFullName as string,
            commitSha: (candidate.commitSha as string).toLowerCase(),
            commitCapturedAt: candidate.commitCapturedAt as string,
            captureSource: candidate.captureSource as GithubCaptureSource,
          }
        : { type: 'url', url: candidate.url as string };
    }
    return { type: 'files', files: [] };
  } catch {
    // Legacy values are stored as a single file URL instead of JSON.
  }

  const name = decodeURIComponent(repositoryUrl.split('/').pop() || 'archivo.zip');
  return { type: 'files', files: [{ name, url: repositoryUrl }] };
}

// Compatibility helper for existing file download consumers.
export function parseDeliveryFiles(repositoryUrl: string): DeliveryFile[] {
  const submission = parseDeliverySubmission(repositoryUrl);
  return submission.type === 'files' ? submission.files : [];
}

export interface Course extends BaseModel {
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  status: 'borrador' | 'en curso' | 'finalizado';
  organizationMode?: CourseOrganizationMode;
  enrollmentMode?: CourseEnrollmentMode;
  contentsEnabled?: boolean;
  aiPreevaluationEnabled?: boolean;
  enrollmentKeyHash?: string;
  invitationPasswordHash?: string;
  students?: string[]; // Relation to multiple User IDs
  teachers?: string[]; // Relation to multiple User IDs
  classes?: string[]; // Relation to multiple Class IDs
  assignments?: string[]; // Relation to multiple Assignment IDs
  inquiries?: string[]; // Relation to multiple Inquiry IDs
  expand?: {
    students?: User[];
    teachers?: User[];
    classes?: Class[];
    assignments?: Assignment[];
    inquiries?: Inquiry[];
    weeks?: CourseWeek[];
    invitations?: CourseEnrollmentInvitation[];
  };
}

export interface AIEvaluationCriterion {
  id: string;
  title: string;
  description: string;
  weight?: number | null;
}

export interface AssignmentAIConfig extends BaseModel {
  assignment: string;
  active: boolean;
  criteria: AIEvaluationCriterion[];
  requiredChecks: string[];
  allowedVerdicts: AIVerdict[];
  gradeEnabled: boolean;
  gradeMin?: number | null;
  gradeMax?: number | null;
  messageGuidance: string;
  additionalInstructions: string;
  version: number;
}

export interface AICriterionResult {
  criterionId: string;
  criterion: string;
  outcome: 'cumple' | 'parcial' | 'no_cumple' | 'no_verificable';
  observation: string;
}

export interface AIPreevaluationResult {
  verdict: AIVerdict;
  suggestedGrade: number | null;
  criteria: AICriterionResult[];
  strengths: string[];
  corrections: string[];
  warnings: string[];
  proposedMessage: string;
}

export interface RepositoryCoverage {
  commitSha: string;
  includedFiles: string[];
  omittedFiles: Array<{ path: string; reason: string }>;
  includedBytes: number;
  expandedBytes: number;
  totalEntries: number;
  partial: boolean;
}

export type AIPreevaluationStatus = 'processing' | 'completed' | 'failed';
export type AIPreevaluationErrorCategory =
  | 'configuration'
  | 'authorization'
  | 'github_not_found'
  | 'github_private'
  | 'github_rate_limit'
  | 'github_timeout'
  | 'github_unavailable'
  | 'repository_limits'
  | 'insufficient_evidence'
  | 'openai_unavailable'
  | 'openai_invalid_response'
  | 'unknown';

export interface AIPreevaluationAttempt extends BaseModel {
  course: string;
  assignment: string;
  delivery: string;
  requestedBy: string;
  status: AIPreevaluationStatus;
  commitSha: string;
  model: string;
  configVersion: number;
  configSnapshot: Omit<AssignmentAIConfig, keyof BaseModel | 'assignment'>;
  coverage?: RepositoryCoverage;
  result?: AIPreevaluationResult;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  providerResponseId?: string;
  errorCategory?: AIPreevaluationErrorCategory;
  errorMessage?: string;
  adoptedAt?: string;
  adoptedBy?: string;
  adoptedAs?: 'draft' | 'published';
}

export interface CourseContent extends BaseModel {
  course: string;
  title: string;
  description: string;
  position: number;
  expand?: {
    course?: Course;
    links?: Link[];
  };
}

export interface CourseWeek extends BaseModel {
  course: string;
  number: number;
  title: string;
  startDate?: string;
  endDate?: string;
  status: CourseWeekStatus;
  publishAt?: string;
  expand?: {
    course?: Course;
  };
}

export interface CourseEnrollment extends BaseModel {
  course: string;
  student: string;
  invitation?: string;
  keyHash?: string;
  expand?: {
    course?: Course;
    student?: User;
    invitation?: CourseEnrollmentInvitation;
  };
}

export interface CourseEnrollmentInvitation extends BaseModel {
  course: string;
  emailNormalized: string;
  status: CourseInvitationStatus;
  activatedStudent?: string;
  activatedAt?: string;
  expand?: {
    course?: Course;
    activatedStudent?: User;
  };
}

export interface CourseEnrollmentAttempt extends BaseModel {
  course: string;
  invitation: string;
  student: string;
  expand?: {
    course?: Course;
    invitation?: CourseEnrollmentInvitation;
    student?: User;
  };
}

export interface Inquiry extends BaseModel {
  title: string;
  description: string;
  status: 'Pendiente' | 'Resuelta';
  author: string; // Relation to User ID
  course?: string; // Relation to Course ID
  class?: string; // Relation to Class ID (optional)
  assignment?: string; // Relation to Assignment ID (optional)
  week?: string; // Relation to CourseWeek ID (optional)
  expand?: {
    author?: User;
    course?: Course;
    class?: Class;
    assignment?: Assignment;
    week?: CourseWeek;
  };
}

export interface InquiryResponse extends BaseModel {
  inquiry: string; // Relation to Inquiry ID
  author: string; // Relation to User ID
  content: string;
  expand?: {
    author?: User;
  };
}
