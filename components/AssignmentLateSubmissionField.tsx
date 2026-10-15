export default function AssignmentLateSubmissionField({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--color-outline-variant)] p-4">
    <input type="checkbox" name="allowLateSubmissions" defaultChecked={defaultChecked} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
    <span><span className="block text-sm font-bold">Permitir entregas fuera de término</span><span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">Permite enviar después de la fecha y hora límite, sin extenderlas. La entrega se identificará como fuera de término; no modifica su calificación.</span></span>
  </label>;
}
