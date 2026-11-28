"use server";

import { requestAIPreevaluationForDelivery } from "@/lib/ai-preevaluation-service";

export async function preevaluatePendingDelivery(deliveryId: string) {
  const result = await requestAIPreevaluationForDelivery(deliveryId, "center");
  if (!result.success) return result.error;
  return result.attempt.status === "processing"
    ? "Hay una preevaluación en curso."
    : "Informe disponible para revisión docente.";
}
