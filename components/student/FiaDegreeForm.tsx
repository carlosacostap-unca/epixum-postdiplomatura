'use client';

import { useActionState, useState } from 'react';
import { saveFiaDegree } from '@/lib/actions-fia-degree';
import { degreeLabels, type FiaDegree } from '@/lib/fia-degree';

const careers = ['tecnicatura', 'ingenieria'] as const;
type Career = (typeof careers)[number];

export function FiaDegreeForm({ degree }: { degree?: FiaDegree }) {
  const [state, action, pending] = useActionState(saveFiaDegree, { message: '', ok: false });
  const [selected, setSelected] = useState(() => careers.filter(career => career === degree || degree === 'ambas'));
  const selection = selected.length === 2 ? 'ambas' : selected[0] || '';

  function toggle(career: Career, checked: boolean) {
    setSelected(current => checked ? [...current, career] : current.filter(item => item !== career));
  }

  return <form action={action} aria-label="Carrera en Fundamentos de Inteligencia Artificial" className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-5">
    <fieldset disabled={pending} className="space-y-3">
      <legend className="text-xl font-bold">¿A qué carrera pertenecés?</legend>
      <p>Marcá las dos tarjetas si cursás ambas carreras.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {careers.map(career => <label key={career} className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-outline-variant)] p-4 hover:border-[var(--color-primary)] has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-surface-container-high)]">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" checked={selected.includes(career)} onChange={event => toggle(career, event.target.checked)} />
          <span className="font-semibold">{degreeLabels[career]}</span>
        </label>)}
      </div>
    </fieldset>
    <input type="hidden" name="degree" value={selection} />
    <button type="submit" className="student-button" disabled={pending || !selection}>{pending ? 'Guardando…' : 'Guardar selección'}</button>
    {state.message && (!state.ok || degree === selection) && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
