'use client';

import { useActionState, useState } from 'react';
import { saveFiaDegree } from '@/lib/actions-fia-degree';
import { degreeLabels, type FiaDegree } from '@/lib/fia-degree';

export function FiaDegreeForm({ degree }: { degree?: FiaDegree }) {
  const [state, action, pending] = useActionState(saveFiaDegree, { message: '', ok: false });
  const [selection, setSelection] = useState(degree || '');
  return <form action={action} aria-label="Carrera en Fundamentos de Inteligencia Artificial" className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-5">
    <h2 className="text-xl font-bold">¿A qué carrera pertenecés?</h2>
    <label className="block space-y-2">
      <span>Seleccioná tu carrera para esta cursada.</span>
      <select name="degree" value={selection} onChange={event => setSelection(event.target.value as FiaDegree)} required className="block min-h-11 w-full max-w-lg rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 py-2">
        <option value="" disabled>Elegí una opción</option>
        {Object.entries(degreeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <button type="submit" className="student-button" disabled={pending}>{pending ? 'Guardando…' : 'Guardar carrera'}</button>
    {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
