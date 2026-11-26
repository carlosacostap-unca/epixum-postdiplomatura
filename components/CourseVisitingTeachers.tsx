'use client';

import { useActionState, useState } from 'react';
import { Button, ConfirmDialog, Field } from '@/components/ui';
import { addVisitingTeacher, removeVisitingTeacher } from '@/lib/actions-course-visiting-teachers';
import type { VisitingTeacherAssignment } from '@/lib/course-visiting-teacher-access';

export default function CourseVisitingTeachers({ courseId, assignments }: { courseId: string; assignments: VisitingTeacherAssignment[] }) {
  const [selected, setSelected] = useState<VisitingTeacherAssignment | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [addError, add, adding] = useActionState(async (_previous: string, form: FormData) => addVisitingTeacher(courseId, form), '');

  async function remove() {
    if (!selected) return;
    setRemoving(true);
    setRemoveError('');
    try {
      const error = await removeVisitingTeacher(courseId, selected.id);
      setRemoveError(error);
    } catch {
      setRemoveError('No pudimos retirar la asignación.');
    } finally {
      setSelected(null);
      setRemoving(false);
    }
  }

  return <section className="space-y-5">
    <h2 className="font-headline text-2xl font-bold">Docentes visitantes</h2>
    <p className="text-[var(--color-text-muted)]">Asigná una cuenta del campus para que consulte el contenido del curso en modo de solo lectura.</p>
    <form action={add} className="flex flex-wrap items-end gap-3">
      <Field label="Correo de la cuenta" required>
        <input name="email" type="email" required maxLength={254} className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-3" />
      </Field>
      <Button type="submit" isPending={adding}>Asignar docente visitante</Button>
    </form>
    {(addError || removeError) && <p role="alert" className="text-[var(--color-error)]">{addError || removeError}</p>}
    {assignments.length > 0 ? <ul className="divide-y divide-[var(--color-outline-variant)]">
      {assignments.map(assignment => <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-semibold">{assignment.expand?.visitor?.name || 'Docente visitante'}</p>
          <p className="break-all text-sm text-[var(--color-text-muted)]">{assignment.expand?.visitor?.email}</p></div>
        <Button variant="secondary" onClick={() => setSelected(assignment)}>Retirar acceso</Button>
      </li>)}
    </ul> : <p>Todavía no hay docentes visitantes asignados.</p>}
    <ConfirmDialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }} title="Retirar acceso"
      description="La cuenta dejará de ver este curso desde el espacio de docencia visitante."
      confirmLabel="Retirar acceso" onConfirm={remove} isPending={removing} tone="danger" />
  </section>;
}
