import { Badge } from '@/components/ui';
import { isPublicationVisible } from '@/lib/publication';
import FormattedDate from '@/components/FormattedDate';

export function PublicationBadge({ status, publishAt }: { status?: string; publishAt?: string }) {
  const published = isPublicationVisible({ publicationStatus: status, publishAt });
  const scheduled = !published && status === 'scheduled';
  return <Badge tone={published ? 'success' : scheduled ? 'info' : 'neutral'}>
    {published ? 'Publicado' : scheduled ? <>Programado{publishAt && <> · <FormattedDate date={publishAt} showTime /></>}</> : 'Borrador'}
  </Badge>;
}
