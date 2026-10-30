'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, ConfirmDialog, Field } from '@/components/ui';
import { manageCourseOutcome } from '@/lib/actions-course-outcomes';
import { outcomeDraftSchema, outcomeHasPendingChanges, outcomeLabels, type CourseOutcome, type OutcomeDraft } from '@/lib/course-outcomes';
import { OutcomeCard } from './OutcomeCard';

const control = 'w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3 text-[var(--color-on-surface)]';
export function OutcomeEditor({ courseId, studentId, studentName, outcome }: { courseId: string; studentId: string; studentName: string; outcome: CourseOutcome | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<OutcomeDraft['status'] | ''>(outcome?.draft.status || '');
  const [grade, setGrade] = useState(outcome?.draft.grade === null || outcome?.draft.grade === undefined ? '' : String(outcome.draft.grade));
  const [feedback, setFeedback] = useState(outcome?.draft.feedback || '');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'publish' | 'withdraw' | null>(null);
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLDivElement>(null);
  const pendingPublication = Boolean(outcome && outcomeHasPendingChanges(outcome));
  function failed(message: string) { setError(message); requestAnimationFrame(() => errorRef.current?.focus()); }
  function run(command: 'save' | 'publish' | 'withdraw') {
    let input: OutcomeDraft | undefined;
    if (command === 'save') {
      const parsed = outcomeDraftSchema.safeParse({ status, grade: grade.trim() === '' ? null : Number(grade), feedback });
      if (!parsed.success) return failed(parsed.error.issues[0].message);
      input = parsed.data;
    }
    setError('');
    startTransition(async () => {
      try {
        const result = await manageCourseOutcome(courseId, studentId, outcome?.revision || '', command, input);
        if (!result.success) { setConfirm(null); return failed(result.error); }
        setDirty(false); setConfirm(null);
        router.refresh();
      } catch { setConfirm(null); failed('No pudimos confirmar el cambio. Actualizá la página antes de reintentar.'); }
    });
  }
  return <div className="space-y-6">
    <OutcomeCard result={outcome?.published || null} heading="Resultado visible para el alumno" />
    {error && <div ref={errorRef} role="alert" tabIndex={-1} className="rounded-xl border border-[var(--color-error)] p-4 text-[var(--color-error)]">{error}</div>}
    <Card><CardContent className="space-y-5"><h2 className="text-xl font-bold">Preparar resultado de cursada</h2>
      <p className="text-sm text-[var(--color-on-surface-variant)]">El estado lo decide el equipo docente. Guardar un borrador conserva el resultado visible hasta que publiques la nueva versión.</p>
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); run('save'); }}>
        <fieldset disabled={pending} className="space-y-5">
          <Field label="Estado final de la cursada" required><select className={control} value={status} onChange={e => { setStatus(e.target.value as OutcomeDraft['status']); setDirty(true); }}><option value="">Seleccioná un estado</option>{Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Nota final (opcional)" hint="De 0 a 10, con hasta dos decimales. Dejá el campo vacío si este resultado no lleva nota."><input className={control} type="number" inputMode="decimal" min={0} max={10} step="0.01" value={grade} onChange={e => { setGrade(e.target.value); setDirty(true); }} /></Field>
          <Field label="Devolución (opcional)" hint="Se mostrará al alumno cuando publiques. Hasta 5000 caracteres."><textarea className={control} rows={5} maxLength={5000} value={feedback} onChange={e => { setFeedback(e.target.value); setDirty(true); }} /></Field>
          <Button type="submit" isPending={pending} pendingLabel="Guardando…" disabled={Boolean(outcome) && !dirty}>Guardar borrador</Button>
        </fieldset>
      </form>
    </CardContent></Card>
    <div className="space-y-4"><h2 className="text-xl font-bold">Publicación individual</h2>
      <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{dirty ? 'Tenés cambios sin guardar. Guardá el borrador antes de publicar o retirar la publicación.' : !outcome ? 'Primero guardá el borrador del resultado.' : pendingPublication ? 'El borrador guardado está pendiente de publicación.' : 'El alumno ve la última versión publicada.'}</p>
      <div className="flex flex-wrap gap-3"><Button disabled={pending || dirty || !pendingPublication} onClick={() => setConfirm('publish')}>Publicar resultado</Button>{outcome?.published && <Button variant="secondary" disabled={pending || dirty} onClick={() => setConfirm('withdraw')}>Retirar publicación</Button>}</div>
    </div>
    <ConfirmDialog open={Boolean(confirm)} onOpenChange={open => { if (!open) setConfirm(null); }} isPending={pending} onConfirm={() => { if (confirm) run(confirm); }} title={confirm === 'publish' ? 'Publicar resultado individual' : 'Retirar publicación'} confirmLabel={confirm === 'publish' ? 'Publicar' : 'Retirar publicación'} description={confirm === 'publish' ? `Se publicará la versión guardada para ${studentName}. Solamente este alumno podrá verla. Estado: ${outcome ? outcomeLabels[outcome.draft.status] : ''}.` : `El resultado dejará de ser visible para ${studentName}. Se conservarán el borrador y el historial.`} />
  </div>;
}
