import 'server-only';

import type PocketBase from 'pocketbase';
import { createServiceClient } from './pocketbase-service';
import { automaticallyPreevaluateDelivery } from './ai-preevaluation-service';
import { parseDeliverySubmission, type Delivery } from '@/types';
import { parseGithubRepositoryUrl } from './github-url';
import { isDocumentSubmission } from './document-submission';

const batchSize = 25;

export async function processPendingPracticalWork(pb: PocketBase, afterId: string) {
  const filter = pb.filter(
    'status != "published" && assignment.course.aiPreevaluationEnabled = true && assignment.assignment_ai_configs_via_assignment.active ?= true && id > {:afterId}',
    { afterId },
  );
  const { items } = await pb.collection('deliveries').getList<Delivery>(1, batchSize, {
    filter, sort: 'id', fields: 'id,repositoryUrl', skipTotal: true,
  });
  for (const delivery of items) {
    const submission = parseDeliverySubmission(delivery.repositoryUrl);
    if (!isDocumentSubmission(submission) && !(submission.type === 'url' && parseGithubRepositoryUrl(submission.url))) continue;
    const result = await automaticallyPreevaluateDelivery(pb, delivery.id);
    if (!result.success && result.error !== 'Reintento diferido.') {
      console.warn('Preevaluación automática:', delivery.id, result.error);
    }
  }
  return items.length === batchSize ? items[items.length - 1].id : '';
}

export function startPracticalWorkScheduler() {
  const host = globalThis as typeof globalThis & { practicalWorkTimer?: ReturnType<typeof setInterval> };
  if (host.practicalWorkTimer || !process.env.OPENAI_API_KEY || process.env.NEXT_PHASE === 'phase-production-build') return;
  let afterId = '';
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      afterId = await processPendingPracticalWork(await createServiceClient(), afterId);
    } catch {
      console.error('No se pudieron consultar las entregas pendientes de preevaluación.');
    } finally {
      busy = false;
    }
  };
  host.practicalWorkTimer = setInterval(tick, 60_000);
  host.practicalWorkTimer.unref();
}
