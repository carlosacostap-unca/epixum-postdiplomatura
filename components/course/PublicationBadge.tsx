import { Badge } from '@/components/ui';
import { isPublished } from '@/lib/publication';

export function PublicationBadge({ status }: { status?: string }) {
  const published = isPublished(status);
  return <Badge tone={published ? 'success' : 'neutral'}>{published ? 'Publicado' : 'Borrador'}</Badge>;
}
