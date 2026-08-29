import 'server-only';

import { createServiceClient } from './pocketbase-service';
import { parseGithubRepositoryUrl } from './github-url';
import { resolvePublicGithubRepository } from './github-repository';
import { serializeDeliveryUrl, type GithubCaptureSource } from '@/types';

export async function serializeDeliveryUrlForAssignment(
  assignmentId: string,
  courseId: string,
  value: string,
  captureSource: GithubCaptureSource,
) {
  const servicePb = await createServiceClient();
  const course = await servicePb.collection('courses').getOne(courseId, { fields: 'id,aiPreevaluationEnabled' });
  if (!course.aiPreevaluationEnabled) return serializeDeliveryUrl(value);

  let config: { active?: boolean } | null = null;
  try {
    config = await servicePb.collection('assignment_ai_configs').getFirstListItem(
      servicePb.filter('assignment = {:assignmentId}', { assignmentId }),
      { fields: 'id,active' },
    );
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
  }
  if (!config?.active) return serializeDeliveryUrl(value);

  const parsed = parseGithubRepositoryUrl(value);
  if (!parsed) throw new Error('Este trabajo requiere la URL HTTPS de la raíz de un repositorio público de GitHub.');
  const repository = await resolvePublicGithubRepository(parsed);
  return serializeDeliveryUrl(repository.canonicalUrl, {
    provider: 'github',
    repositoryFullName: repository.fullName,
    commitSha: repository.commitSha,
    commitCapturedAt: new Date().toISOString(),
    captureSource,
  });
}
