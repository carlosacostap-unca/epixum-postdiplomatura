import { Badge, Card, CardContent } from '@/components/ui';
import FormattedDate from '@/components/FormattedDate';
import { outcomeGradeLabel, outcomeLabels, outcomeTone, type PublishedOutcome } from '@/lib/course-outcomes';

export function OutcomeCard({ result, heading = 'Tu resultado de cursada' }: { result: PublishedOutcome | null; heading?: string }) {
  return <Card><CardContent className="space-y-4"><h2 className="text-xl font-bold">{heading}</h2>
    {result ? <>
      <div className="flex flex-wrap items-center gap-3"><Badge tone={outcomeTone(result.status)}>{outcomeLabels[result.status]}</Badge>{result.grade !== null && <p className="font-bold">Nota final: {outcomeGradeLabel(result.grade)}</p>}</div>
      {result.feedback && <p className="whitespace-pre-wrap break-words text-[var(--color-on-surface-variant)]">{result.feedback}</p>}
      <p className="text-sm text-[var(--color-on-surface-variant)]">Publicado el <FormattedDate date={result.publishedAt} showTime /></p>
    </> : <p className="text-[var(--color-on-surface-variant)]">El equipo docente todavía no publicó tu resultado de cursada.</p>}
  </CardContent></Card>;
}
