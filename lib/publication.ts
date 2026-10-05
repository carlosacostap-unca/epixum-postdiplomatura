export type PublicationStatus = 'draft' | 'published';

// Existing records have no explicit status and retain their previous visibility.
export function isPublished(status: string | null | undefined) {
  return status == null || status === '' || status === 'published';
}

export function publicationPatch(value: FormDataEntryValue | null, creating = false) {
  if (value === null) return creating ? { publicationStatus: 'draft' as const } : {};
  if (value !== 'draft' && value !== 'published') throw new Error('Estado de publicación inválido');
  return { publicationStatus: value };
}
