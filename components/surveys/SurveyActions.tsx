'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog } from '@/components/ui';
import { manageSurvey } from '@/lib/actions-course-surveys';
import { surveyIsOpen, type CourseSurvey } from '@/lib/course-surveys';
import type { SurveyCommand } from '@/lib/course-survey-service';

export function SurveyActions({ survey, base, dirty = false }: { survey: CourseSurvey; base: string; dirty?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<SurveyCommand | null>(null);
  function run(command: SurveyCommand) {
    setError('');
    startTransition(async () => {
      try {
        const result = await manageSurvey(survey.course, survey.id, command, survey.revision);
        if (!result.success) { setError(result.error); setConfirm(null); return; }
        setConfirm(null);
        if (command === 'delete') router.push(base);
        else if (command === 'duplicate') router.push(`${base}/${result.id}`);
        router.refresh();
      } catch { setError('No pudimos completar la operación. Intentá nuevamente.'); setConfirm(null); }
    });
  }
  return <div className="space-y-3">
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
    <div className="flex flex-wrap gap-3">
      {survey.status === 'draft' && <Button disabled={pending || dirty} onClick={() => setConfirm('publish')}>Publicar encuesta guardada</Button>}
      {surveyIsOpen(survey) && <Button variant="secondary" disabled={pending} onClick={() => setConfirm('close')}>Cerrar encuesta</Button>}
      <Button variant="secondary" disabled={pending || dirty} onClick={() => run('duplicate')}>Duplicar encuesta</Button>
      {survey.status === 'draft' && <Button variant="ghost" disabled={pending} onClick={() => setConfirm('delete')}>Eliminar borrador</Button>}
    </div>
    <ConfirmDialog open={Boolean(confirm)} onOpenChange={open => { if (!open) setConfirm(null); }} isPending={pending} onConfirm={() => { if (confirm) run(confirm); }} title={confirm === 'publish' ? 'Publicar encuesta' : confirm === 'close' ? 'Cerrar encuesta' : 'Eliminar borrador'} confirmLabel={confirm === 'publish' ? 'Publicar' : confirm === 'close' ? 'Cerrar encuesta' : 'Eliminar'} tone={confirm === 'delete' ? 'danger' : 'default'} description={confirm === 'publish' ? 'Se publicará la última versión guardada. Las preguntas y la privacidad quedarán fijas. Guardá antes cualquier cambio pendiente en el editor.' : confirm === 'close' ? 'Los alumnos ya no podrán enviar respuestas. Los resultados se conservarán.' : 'Se eliminará este borrador. Esta acción no se puede deshacer.'} />
  </div>;
}
