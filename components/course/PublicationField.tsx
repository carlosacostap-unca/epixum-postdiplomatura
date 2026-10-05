'use client';

import { useId } from 'react';
import { isPublished } from '@/lib/publication';

export function PublicationField({ status, existing = false, disabled = false, assignment = false }: {
  status?: string; existing?: boolean; disabled?: boolean; assignment?: boolean;
}) {
  const id = useId();
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold">Estado de publicación</label>
    <select id={id} name="publicationStatus" defaultValue={existing && isPublished(status) ? 'published' : 'draft'} disabled={disabled}
      aria-describedby={`${id}-help`}
      className="min-h-11 w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container)] px-4 py-3 text-[var(--color-on-surface)]">
      <option value="draft">Borrador</option>
      <option value="published">Publicado</option>
    </select>
    <p id={`${id}-help`} className="text-sm text-[var(--color-on-surface-variant)]">
      {assignment
        ? 'En borrador, los estudiantes no ven el trabajo ni sus recursos y no pueden hacer entregas. Publicarlo no publica automáticamente sus recursos en borrador.'
        : 'Los estudiantes solo ven los recursos publicados cuando la clase o el trabajo práctico están disponibles.'}
    </p>
  </div>;
}
