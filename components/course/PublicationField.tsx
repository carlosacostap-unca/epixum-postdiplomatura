'use client';

import { useId, useState } from 'react';
import { isPublished, publicationLocalDateTime } from '@/lib/publication';

export function PublicationField({ status, publishAt, scheduling = false, existing = false, disabled = false, assignment = false, entity = 'contenido' }: {
  status?: string; publishAt?: string; scheduling?: boolean; existing?: boolean; disabled?: boolean; assignment?: boolean; entity?: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState(existing ? (status === 'scheduled' && scheduling ? 'scheduled' : isPublished(status) ? 'published' : 'draft') : 'draft');
  const [date, setDate] = useState(publicationLocalDateTime(publishAt));
  const instant = date && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : '';
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold">Estado de publicación</label>
    <select id={id} name="publicationStatus" value={selected} onChange={event => setSelected(event.target.value)} disabled={disabled}
      aria-describedby={`${id}-help`}
      className="min-h-11 w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container)] px-4 py-3 text-[var(--color-on-surface)]">
      <option value="draft">Borrador</option>
      <option value="published">Publicado</option>
      {scheduling && <option value="scheduled">Programado</option>}
    </select>
    {scheduling && selected === 'scheduled' && <div className="space-y-2">
      <label htmlFor={`${id}-date`} className="block text-sm font-semibold">Fecha y hora de publicación</label>
      <input id={`${id}-date`} type="datetime-local" required disabled={disabled} value={date} onChange={event => setDate(event.target.value)}
        aria-describedby={`${id}-timezone`} className="min-h-11 w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container)] px-4 py-3" />
      <input type="hidden" name="publishAt" value={instant} disabled={disabled} />
      <p id={`${id}-timezone`} className="text-sm text-[var(--color-on-surface-variant)]">Hora local de tu dispositivo. Se hará visible automáticamente al llegar esa fecha, siempre que su unidad esté disponible.</p>
    </div>}
    <p id={`${id}-help`} className="text-sm text-[var(--color-on-surface-variant)]">
      {scheduling
        ? `En borrador, los estudiantes no ven ${assignment ? 'el trabajo práctico' : entity === 'clase' ? 'la clase' : 'el contenido'} ni sus recursos.${assignment || entity === 'clase' ? ' Publicarlo no publica automáticamente los recursos en borrador.' : ''}`
        : assignment
        ? 'En borrador, los estudiantes no ven el trabajo ni sus recursos y no pueden hacer entregas. Publicarlo no publica automáticamente sus recursos en borrador.'
        : 'Los estudiantes solo ven los recursos publicados cuando la clase o el trabajo práctico están disponibles.'}
    </p>
  </div>;
}
