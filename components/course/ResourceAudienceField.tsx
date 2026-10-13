'use client';

import { useId } from 'react';
import { isSharedResourceAudience } from '@/lib/resource-audience';

export function ResourceAudienceField({ audience, disabled = false }: { audience?: string; disabled?: boolean }) {
  const id = useId();
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold">Disponible para</label>
    <select id={id} name="audience" defaultValue={isSharedResourceAudience(audience) ? 'everyone' : 'teachers'} disabled={disabled}
      aria-describedby={`${id}-help`} className="min-h-11 w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container)] px-4 py-3 text-[var(--color-on-surface)]">
      <option value="everyone">Docentes y alumnos</option>
      <option value="teachers">Solo docentes</option>
    </select>
    <p id={`${id}-help`} className="text-sm text-[var(--color-on-surface-variant)]">Los recursos solo para docentes quedan reservados al equipo docente del curso y a administración, incluso si están publicados. Para compartirlos con alumnos también deben estar publicados.</p>
  </div>;
}
