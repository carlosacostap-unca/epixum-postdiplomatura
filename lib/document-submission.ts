import type { DeliverySubmission } from '@/types';

export function documentExtension(name: string): 'pdf' | 'docx' | 'txt' | 'md' | null {
  const extension = name.toLowerCase().match(/\.(pdf|docx|txt|md)$/)?.[1];
  return (extension || null) as ReturnType<typeof documentExtension>;
}

export function publicGoogleDocumentId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port || url.username || url.password) return null;
    return url.pathname.match(/^\/document\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1] || null;
  } catch { return null; }
}

/** Eligibility only; the server validates storage ownership and every download. */
export function isDocumentSubmission(submission: DeliverySubmission): boolean {
  if (submission.type === 'files') return submission.files.some(file => documentExtension(file.name));
  if (publicGoogleDocumentId(submission.url)) return true;
  try { return Boolean(documentExtension(new URL(submission.url).pathname)); }
  catch { return false; }
}
