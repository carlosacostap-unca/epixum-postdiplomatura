import { Badge } from '@/components/ui';
import { deliveryTiming } from '@/lib/assignment-deadline';
import type { Delivery, DeliveryHistoryEntry } from '@/types';

export default function DeliveryTimingBadge({ delivery, dueDate }: { delivery: Pick<Delivery, 'created' | 'submittedAt' | 'deadlineSnapshot'> | Pick<DeliveryHistoryEntry, 'submittedAt' | 'deadlineSnapshot'>; dueDate?: string }) {
  const timing = deliveryTiming(delivery, dueDate);
  if (!timing.late) return null;
  return <Badge tone="warning" title={timing.recorded ? `Vencimiento registrado al entregar: ${timing.dueDate}` : 'Entrega histórica: comparación con el vencimiento actual; no se conserva el plazo original.'}>Fuera de término{!timing.recorded && <span className="sr-only"> (según vencimiento actual)</span>}</Badge>;
}
