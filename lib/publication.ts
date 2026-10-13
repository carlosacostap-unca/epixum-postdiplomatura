export type PublicationStatus = 'draft' | 'published' | 'scheduled';

export interface Publication {
  publicationStatus?: string | null;
  publishAt?: string | null;
}

// Existing records have no explicit status and retain their previous visibility.
export function isPublished(status: string | null | undefined) {
  return status == null || status === '' || status === 'published';
}

export function isPublicationVisible(record: Publication, now = new Date()) {
  if (isPublished(record.publicationStatus)) return true;
  if (record.publicationStatus !== 'scheduled' || !record.publishAt) return false;
  const timestamp = Date.parse(record.publishAt);
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

// The browser sends a UTC instant; never interpret a timezone-less date on the server.
export function scheduledPublicationPatch(formData: FormData, creating = false) {
  const status = formData.get('publicationStatus');
  if (status === null) return creating ? { publicationStatus: 'draft' as const, publishAt: '' } : {};
  if (status !== 'draft' && status !== 'published' && status !== 'scheduled') {
    throw new Error('Estado de publicación inválido');
  }
  if (status !== 'scheduled') return { publicationStatus: status, publishAt: '' };
  const value = formData.get('publishAt');
  if (typeof value !== 'string' || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('Indicá una fecha y hora de publicación válida');
  }
  return { publicationStatus: status, publishAt: new Date(value).toISOString() };
}

export function publicationLocalDateTime(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function publicationPatch(value: FormDataEntryValue | null, creating = false) {
  if (value === null) return creating ? { publicationStatus: 'draft' as const } : {};
  if (value !== 'draft' && value !== 'published') throw new Error('Estado de publicación inválido');
  return { publicationStatus: value };
}
