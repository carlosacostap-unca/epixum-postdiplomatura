'use client';

import { useState } from 'react';
import type { CourseSurvey } from '@/lib/course-surveys';
import { SurveyEditor } from './SurveyEditor';
import { SurveyActions } from './SurveyActions';

export function SurveyDraft({ survey, base }: { survey: CourseSurvey; base: string }) {
  const [dirty, setDirty] = useState(false);
  return <>
    <SurveyEditor courseId={survey.course} base={base} survey={survey} onDirtyChange={setDirty} />
    <div className="space-y-3 border-t border-[var(--color-outline-variant)] pt-6"><h3 className="font-bold">Publicación y gestión del borrador</h3><p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{dirty ? 'Guardá los cambios pendientes antes de publicar o duplicar.' : 'La versión guardada está lista para publicar.'}</p><SurveyActions survey={survey} base={base} dirty={dirty} /></div>
  </>;
}
