'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog, useToast } from '@/components/ui';
import { deleteInteractiveLesson } from '@/lib/actions-interactive-classes';

export function InteractiveLessonDelete({ courseId, lessonId, title }: { courseId: string; lessonId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { notify } = useToast();
  async function remove() {
    setPending(true);
    try {
      const result = await deleteInteractiveLesson(courseId, lessonId);
      if (!result.success) throw new Error(result.error);
      setOpen(false);
      notify({ title: 'Clase interactiva eliminada', tone: 'success' });
      router.push(`/docentes/cursos/${courseId}/interactivas`);
      router.refresh();
    } catch (error) { notify({ title: 'No pudimos eliminarla', description: error instanceof Error ? error.message : 'Intentá nuevamente.', tone: 'error' }); }
    finally { setPending(false); }
  }
  return <><Button variant="ghost" onClick={() => setOpen(true)}>Eliminar clase interactiva</Button><ConfirmDialog open={open} onOpenChange={setOpen} title="Eliminar clase interactiva" description={<>Se eliminará el material de <strong>{title}</strong>. La clase habitual se conserva. Esta acción no se puede deshacer.</>} confirmLabel="Eliminar" tone="danger" isPending={pending} onConfirm={remove} /></>;
}
