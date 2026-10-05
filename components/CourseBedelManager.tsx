'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addCourseBedel, removeCourseBedel } from '@/lib/actions-course-bedels';
import type { CourseBedel } from '@/lib/course-bedels';
import { Button, Card, CardContent, ConfirmDialog, EmptyState, Field } from '@/components/ui';

const inputClass = 'w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-3';

export default function CourseBedelManager({ courseId, bedels }: { courseId: string; bedels: CourseBedel[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState<CourseBedel | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true); setError(''); setMessage('');
    try {
      const result = await addCourseBedel(courseId, {
        firstName: String(data.get('firstName') || ''), lastName: String(data.get('lastName') || ''), email: String(data.get('email') || ''),
      });
      if (!result.success) { setError(result.error || 'No se pudo guardar.'); return; }
      form.reset(); setMessage('Bedel asignado. Podrá ingresar con su email verificado.'); router.refresh();
    } catch { setError('No se pudo guardar. Intentá nuevamente.'); }
    finally { setPending(false); }
  }

  async function remove() {
    if (!removing) return;
    setPending(true); setError(''); setMessage('');
    try {
      const result = await removeCourseBedel(courseId, removing.id);
      if (!result.success) { setError(result.error || 'No se pudo retirar.'); setRemoving(null); return; }
      setRemoving(null); setMessage('Bedel retirado del curso.'); router.refresh();
    } catch { setError('No se pudo retirar. Intentá nuevamente.'); setRemoving(null); }
    finally { setPending(false); }
  }

  return <div className="space-y-6">
    <div><h2 className="font-headline text-2xl font-bold">Bedeles del curso</h2><p className="mt-2 text-[var(--color-text-muted)]">Podés asignar ninguno, uno o varios. Cada bedel puede consultar el contenido y los registros de asistencia, sin editar el curso.</p></div>
    <Card><CardContent><form onSubmit={add} className="space-y-5">
      <h3 className="font-bold">Asignar bedel</h3>
      <p className="text-sm text-[var(--color-text-muted)]">No necesita tener una cuenta todavía. Al ingresar con este email verificado verá el curso en Bedelía.</p>
      <fieldset disabled={pending} className="grid gap-4 md:grid-cols-3">
        <Field label="Apellido" required><input name="lastName" maxLength={120} autoComplete="family-name" className={inputClass} /></Field>
        <Field label="Nombre" required><input name="firstName" maxLength={120} autoComplete="given-name" className={inputClass} /></Field>
        <Field label="Email" required><input name="email" type="email" maxLength={254} autoComplete="email" className={inputClass} /></Field>
      </fieldset>
      <Button type="submit" isPending={pending}>Asignar bedel</Button>
    </form></CardContent></Card>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
    {message && <p role="status">{message}</p>}
    {bedels.length === 0 ? <EmptyState icon="visibility" title="Este curso no tiene bedeles" description="La asignación es opcional. Podés agregar uno cuando lo necesites." /> :
      <Card><CardContent><ul className="divide-y divide-[var(--color-outline-variant)]">{bedels.map(bedel => <li key={bedel.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="min-w-0"><p className="font-bold">{bedel.lastName}, {bedel.firstName}</p><p className="break-all text-sm text-[var(--color-text-muted)]">{bedel.email}</p></div>
        <Button variant="secondary" disabled={pending} onClick={() => setRemoving(bedel)} aria-label={`Retirar a ${bedel.firstName} ${bedel.lastName}`}>Retirar</Button>
      </li>)}</ul></CardContent></Card>}
    <ConfirmDialog open={Boolean(removing)} onOpenChange={open => !open && setRemoving(null)} title="Retirar bedel" description={`${removing?.firstName || ''} ${removing?.lastName || ''} dejará de acceder a este curso como bedel. Sus otras asignaciones se conservarán.`} confirmLabel="Retirar bedel" onConfirm={remove} isPending={pending} tone="danger" />
  </div>;
}
