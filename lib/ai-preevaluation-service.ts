import 'server-only';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { ZodError } from 'zod';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { teacherCanManageCourse } from './teacher-scope';
import { assignmentAIConfigInputSchema, createAIPreevaluationResultSchema, validateAIResultForConfig } from './ai-preevaluation-schema';
import { AI_PREEVALUATION_INSTRUCTIONS, buildAIPreevaluationInput } from './ai-preevaluation-prompt';
import { downloadGithubZipball, GithubRepositoryError, prepareRepositoryEvidence, resolvePublicGithubRepository } from './github-repository';
import { parseGithubRepositoryUrl } from './github-url';
import {
  isGithubDeliverySubmission,
  parseDeliverySubmission,
  serializeDeliveryUrl,
  type AIPreevaluationAttempt,
  type AIPreevaluationErrorCategory,
  type AIPreevaluationResult,
  type Assignment,
  type AssignmentAIConfig,
  type Course,
  type Delivery,
  type RepositoryCoverage,
} from '@/types';

const MODEL = 'gpt-5.6-luna';
const STALE_PROCESSING_MS = 10 * 60 * 1_000;

export interface AIPreevaluationDTO {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  commitSha: string;
  captureSource: 'student-submission' | 'student-update' | 'legacy-first-evaluation';
  model: string;
  configVersion: number;
  coverage?: RepositoryCoverage;
  result?: AIPreevaluationResult;
  errorCategory?: AIPreevaluationErrorCategory;
  errorMessage?: string;
  created: string;
  updated: string;
  adoptedAt?: string;
  adoptedAs?: 'draft' | 'published';
}

interface AuthorizedContext {
  user: { id: string; role: string };
  delivery: Delivery;
  assignment: Assignment;
  course: Course;
}

function dto(record: Partial<AIPreevaluationAttempt>, captureSource: AIPreevaluationDTO['captureSource'] = 'student-submission'): AIPreevaluationDTO {
  return {
    id: String(record.id || ''), status: record.status || 'failed', commitSha: String(record.commitSha || ''), captureSource,
    model: String(record.model || MODEL), configVersion: Number(record.configVersion || 1), coverage: record.coverage,
    result: record.result, errorCategory: record.errorCategory, errorMessage: record.errorMessage,
    created: String(record.created || ''), updated: String(record.updated || ''), adoptedAt: record.adoptedAt, adoptedAs: record.adoptedAs,
  };
}

async function authorizeDelivery(deliveryId: string): Promise<AuthorizedContext> {
  if (!/^[a-z0-9]{15}$/i.test(deliveryId)) throw new Error('No autorizado');
  const pb = await createServerClient();
  const user = pb.authStore.model;
  if (!user || (user.role !== 'docente' && user.role !== 'admin')) throw new Error('No autorizado');
  const delivery = await pb.collection('deliveries').getOne<Delivery>(deliveryId, { fields: 'id,assignment,repositoryUrl,created,updated' });
  const assignment = await pb.collection('assignments').getOne<Assignment>(delivery.assignment, { fields: 'id,title,description,course' });
  if (!assignment.course) throw new Error('No autorizado');
  const course = await pb.collection('courses').getOne<Course>(assignment.course, { fields: 'id,teachers,aiPreevaluationEnabled' });
  if (delivery.assignment !== assignment.id || !teacherCanManageCourse(course, { id: user.id, role: user.role })) throw new Error('No autorizado');
  return { user: { id: user.id, role: user.role }, delivery, assignment, course };
}

async function activeConfig(servicePb: Awaited<ReturnType<typeof createServiceClient>>, context: AuthorizedContext) {
  if (!context.course.aiPreevaluationEnabled) throw new Error('La preevaluación con IA está deshabilitada para este curso.');
  let record: AssignmentAIConfig;
  try {
    record = await servicePb.collection('assignment_ai_configs').getFirstListItem<AssignmentAIConfig>(servicePb.filter('assignment = {:assignmentId}', { assignmentId: context.assignment.id }));
  } catch {
    throw new Error('Este trabajo práctico no tiene una configuración de IA activa.');
  }
  const parsed = assignmentAIConfigInputSchema.safeParse({
    active: record.active, criteria: record.criteria, requiredChecks: record.requiredChecks, allowedVerdicts: record.allowedVerdicts,
    gradeEnabled: record.gradeEnabled, gradeMin: record.gradeMin ?? null, gradeMax: record.gradeMax ?? null,
    messageGuidance: record.messageGuidance || '', additionalInstructions: record.additionalInstructions || '',
  });
  if (!parsed.success || !parsed.data.active) throw new Error('Este trabajo práctico no tiene una configuración de IA completa y activa.');
  return { parsed: parsed.data, version: Math.max(1, Number(record.version || 1)) };
}

async function capturedRepository(servicePb: Awaited<ReturnType<typeof createServiceClient>>, context: AuthorizedContext) {
  const submission = parseDeliverySubmission(context.delivery.repositoryUrl);
  if (submission.type !== 'url') throw new Error('La entrega no es un repositorio público de GitHub elegible.');
  if (isGithubDeliverySubmission(submission)) {
    const parsed = parseGithubRepositoryUrl(submission.url);
    if (!parsed || parsed.fullName.toLowerCase() !== submission.repositoryFullName.toLowerCase()) throw new Error('La captura GitHub de la entrega no es consistente.');
    return submission;
  }
  const parsed = parseGithubRepositoryUrl(submission.url);
  if (!parsed) throw new Error('La entrega no es la URL raíz de un repositorio público de GitHub.');
  const repository = await resolvePublicGithubRepository(parsed);
  const capturedAt = new Date().toISOString();
  const repositoryUrl = serializeDeliveryUrl(repository.canonicalUrl, {
    provider: 'github', repositoryFullName: repository.fullName, commitSha: repository.commitSha,
    commitCapturedAt: capturedAt, captureSource: 'legacy-first-evaluation',
  });
  await servicePb.collection('deliveries').update(context.delivery.id, { repositoryUrl });
  return { type: 'url' as const, url: repository.canonicalUrl, provider: 'github' as const, repositoryFullName: repository.fullName,
    commitSha: repository.commitSha, commitCapturedAt: capturedAt, captureSource: 'legacy-first-evaluation' as const };
}

async function existingProcessing(servicePb: Awaited<ReturnType<typeof createServiceClient>>, deliveryId: string, commitSha: string, configVersion: number) {
  try {
    const record = await servicePb.collection('ai_preevaluations').getFirstListItem<AIPreevaluationAttempt>(
      servicePb.filter('delivery = {:deliveryId} && commitSha = {:commitSha} && configVersion = {:configVersion} && status = "processing"', { deliveryId, commitSha, configVersion }), { sort: '-created' },
    );
    const updated = Date.parse(record.updated || record.created);
    if (Number.isFinite(updated) && Date.now() - updated < STALE_PROCESSING_MS) return record;
    await servicePb.collection('ai_preevaluations').update(record.id, { status: 'failed', errorCategory: 'unknown', errorMessage: 'El intento anterior quedó interrumpido y puede reintentarse.' });
  } catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
  return null;
}

function sanitizedFailure(error: unknown): { category: AIPreevaluationErrorCategory; message: string } {
  if (error instanceof GithubRepositoryError) return { category: error.category, message: error.message };
  if (error instanceof ZodError || (error instanceof Error && /proveedor|respuesta|veredicto|criterios|nota sugerida/i.test(error.message))) {
    return { category: 'openai_invalid_response', message: 'OpenAI no devolvió una preevaluación utilizable. Podés volver a intentar.' };
  }
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) return { category: 'configuration', message: 'OpenAI rechazó la configuración del servidor.' };
    if (error.status === 429) return { category: 'openai_unavailable', message: 'OpenAI alcanzó temporalmente su límite de uso. Intentá más tarde.' };
    return { category: 'openai_unavailable', message: 'OpenAI no está disponible en este momento. Podés volver a intentar.' };
  }
  return { category: 'unknown', message: 'No se pudo completar la preevaluación. Podés volver a intentar.' };
}

async function callOpenAI(params: { assignment: Assignment; config: ReturnType<typeof assignmentAIConfigInputSchema.parse>; commitSha: string; evidence: string }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY_MISSING');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 });
  const response = await client.responses.parse({
    model: MODEL, reasoning: { effort: 'medium' }, store: false, tools: [], max_output_tokens: 8_000,
    instructions: AI_PREEVALUATION_INSTRUCTIONS,
    input: buildAIPreevaluationInput({ assignmentTitle: params.assignment.title, assignmentDescription: params.assignment.description || '', config: params.config, commitSha: params.commitSha, evidence: params.evidence }),
    text: { format: zodTextFormat(createAIPreevaluationResultSchema(params.config.allowedVerdicts, { enabled: params.config.gradeEnabled, min: params.config.gradeMin, max: params.config.gradeMax }), 'academic_preevaluation') },
  });
  if (!response.output_parsed) throw new Error('Respuesta del proveedor ausente o rechazada.');
  return { response, result: validateAIResultForConfig(response.output_parsed, params.config) };
}

export async function requestAIPreevaluationForDelivery(deliveryId: string): Promise<{ success: true; attempt: AIPreevaluationDTO } | { success: false; error: string; attempt?: AIPreevaluationDTO }> {
  let attemptId = '';
  let servicePb: Awaited<ReturnType<typeof createServiceClient>> | null = null;
  let captureSource: AIPreevaluationDTO['captureSource'] = 'student-submission';
  try {
    const context = await authorizeDelivery(deliveryId);
    servicePb = await createServiceClient();
    const config = await activeConfig(servicePb, context);
    if (!process.env.OPENAI_API_KEY) return { success: false, error: 'OpenAI no está configurado en el servidor.' };
    const repository = await capturedRepository(servicePb, context);
    captureSource = repository.captureSource;
    const duplicate = await existingProcessing(servicePb, deliveryId, repository.commitSha, config.version);
    if (duplicate) return { success: true, attempt: dto(duplicate, captureSource) };
    let attempt: AIPreevaluationAttempt;
    try {
      attempt = await servicePb.collection('ai_preevaluations').create<AIPreevaluationAttempt>({
        course: context.course.id, assignment: context.assignment.id, delivery: context.delivery.id, requestedBy: context.user.id,
        status: 'processing', commitSha: repository.commitSha, model: MODEL, configVersion: config.version, configSnapshot: config.parsed,
      });
    } catch (error) {
      const concurrent = await existingProcessing(servicePb, deliveryId, repository.commitSha, config.version).catch(() => null);
      if (concurrent) return { success: true, attempt: dto(concurrent, captureSource) };
      throw error;
    }
    attemptId = attempt.id;
    const zip = await downloadGithubZipball(repository.repositoryFullName, repository.commitSha);
    const evidence = await prepareRepositoryEvidence(zip, repository.commitSha);
    const generated = await callOpenAI({ assignment: context.assignment, config: config.parsed, commitSha: repository.commitSha, evidence: evidence.text });
    const usage = generated.response.usage ? { inputTokens: generated.response.usage.input_tokens, outputTokens: generated.response.usage.output_tokens, totalTokens: generated.response.usage.total_tokens } : undefined;
    const completed = await servicePb.collection('ai_preevaluations').update<AIPreevaluationAttempt>(attemptId, {
      status: 'completed', coverage: evidence.coverage, result: generated.result, usage,
      providerResponseId: generated.response.id, errorCategory: '', errorMessage: '',
    });
    return { success: true, attempt: dto(completed, captureSource) };
  } catch (error) {
    if (error instanceof Error && (error.message === 'No autorizado' || error.message.startsWith('La preevaluación') || error.message.startsWith('Este trabajo') || error.message.startsWith('La entrega') || error.message.startsWith('La captura'))) {
      return { success: false, error: error.message };
    }
    const failure = error instanceof Error && error.message === 'OPENAI_API_KEY_MISSING' ? { category: 'configuration' as const, message: 'OpenAI no está configurado en el servidor.' } : sanitizedFailure(error);
    if (attemptId && servicePb) {
      try {
        const failed = await servicePb.collection('ai_preevaluations').update<AIPreevaluationAttempt>(attemptId, { status: 'failed', errorCategory: failure.category, errorMessage: failure.message });
        return { success: false, error: failure.message, attempt: dto(failed, captureSource) };
      } catch { /* El error principal ya está sanitizado. */ }
    }
    return { success: false, error: failure.message };
  }
}

export async function getLatestAIPreevaluationForDelivery(deliveryId: string): Promise<AIPreevaluationDTO | null> {
  const context = await authorizeDelivery(deliveryId);
  const servicePb = await createServiceClient();
  try {
    const record = await servicePb.collection('ai_preevaluations').getFirstListItem<AIPreevaluationAttempt>(servicePb.filter('delivery = {:deliveryId}', { deliveryId }), { sort: '-created' });
    const submission = parseDeliverySubmission(context.delivery.repositoryUrl);
    const source = isGithubDeliverySubmission(submission) ? submission.captureSource : 'student-submission';
    return dto(record, source);
  } catch (error) { if ((error as { status?: number }).status === 404) return null; throw error; }
}

export function providerStatus() {
  return { openaiConfigured: Boolean(process.env.OPENAI_API_KEY), githubTokenConfigured: Boolean(process.env.GITHUB_API_TOKEN), githubPublicAccessAvailable: true };
}
