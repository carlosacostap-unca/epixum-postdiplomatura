'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, useToast } from '@/components/ui';
import { saveCourseModule } from '@/lib/actions-course-weeks';
import type { Assignment, CourseModule } from '@/types';

export function ModuleEditor({ courseId, modules, assignments }: { courseId: string; modules: CourseModule[]; assignments: Assignment[] }) {
  const [selected, setSelected] = useState<CourseModule | 'new' | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { notify } = useToast();
  const current = selected && selected !== 'new' ? selected : undefined;
  function open(value: CourseModule | 'new') { setError(''); setSelected(value); }
  const input = 'block min-h-11 w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container)] px-3';
  async function save(data: FormData) {
    setPending(true);
    try {
      const result = await saveCourseModule(courseId, current?.id, data);
      if (!result.success) { setError(result.error); return; }
      setSelected(null);
      notify({ title: 'Módulo guardado', tone: 'success' });
      router.refresh();
    } finally { setPending(false); }
  }
  return <div className="space-y-3">
    <details><summary className="cursor-pointer font-semibold">Administrar módulos</summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {modules.map(module => <Button key={module.id} variant="secondary" onClick={() => open(module)}>Editar módulo {module.number}</Button>)}
        <Button onClick={() => open('new')}>Nuevo módulo</Button>
      </div>
    </details>
    <Dialog open={!!selected} onOpenChange={value => { if (!value) setSelected(null); }} title={current ? 'Editar módulo' : 'Nuevo módulo'} dismissible={!pending}>
      <form key={selected === 'new' ? 'new' : current?.id} action={save} className="space-y-4">
        <label className="block">Número de orden<input name="number" type="number" min="1" required defaultValue={current?.number ?? Math.max(0, ...modules.map(m => m.number)) + 1} className={input} /></label>
        <label className="block">Título<input name="title" maxLength={160} required defaultValue={current?.title} className={input} /></label>
        <label className="block">Entrega acreditable<select name="assignment" defaultValue={current?.assignment || ''} className={input}>
          <option value="">Elegir más adelante</option>
          {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select></label>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" isPending={pending}>Guardar módulo</Button>
      </form>
    </Dialog>
  </div>;
}
