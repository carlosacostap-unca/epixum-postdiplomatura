import { Badge } from '@/components/ui';
import { isSharedResourceAudience } from '@/lib/resource-audience';

export function ResourceAudienceBadge({ audience }: { audience?: string }) {
  return isSharedResourceAudience(audience) ? null : <Badge tone="info">Solo docentes</Badge>;
}
