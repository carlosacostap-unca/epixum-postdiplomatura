'use server';

import { getLatestAIPreevaluationForDelivery, providerStatus, requestAIPreevaluationForDelivery } from '@/lib/ai-preevaluation-service';

export async function requestAIPreevaluation(deliveryId: string) {
  return requestAIPreevaluationForDelivery(deliveryId);
}

export async function getLatestAIPreevaluation(deliveryId: string) {
  return getLatestAIPreevaluationForDelivery(deliveryId);
}

export async function getAIPreevaluationProviderStatus() {
  return providerStatus();
}
