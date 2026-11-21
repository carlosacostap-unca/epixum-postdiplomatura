import Link from 'next/link';
import type { getSingleMakeupOutcome } from '@/lib/single-makeup-outcome';

type Outcome = NonNullable<Awaited<ReturnType<typeof getSingleMakeupOutcome>>>;
const labels = { promoted: 'Promocionaste', regular: 'Quedaste regular', free: 'Quedaste libre' };

export function SingleMakeupOutcomeNotice({ courseId, surveysEnabled, outcome, feedbackSurvey, assigned = true }: { courseId: string; surveysEnabled?: boolean; outcome: Pick<Outcome, 'condition' | 'recovered'> & { survey: string }; feedbackSurvey?: string; assigned?: boolean }) {
  return <section aria-label="Situación final de cursada" className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-5">
    <h2 className="text-xl font-bold">Situación final de cursada</h2>
    <p><strong>{labels[outcome.condition]}</strong></p>
    {assigned && outcome.recovered === null && <p>Ausente en el recuperatorio.</p>}
    {outcome.condition !== 'promoted' && outcome.recovered !== null && <p>Nota del recuperatorio: {outcome.recovered.toLocaleString('es-AR')} / 10.</p>}
    {outcome.condition === 'promoted' && surveysEnabled && <>
      <p>Al enviar la encuesta vas a poder ver el detalle de tus notas y la nota final.</p>
      <Link className="student-text-action" href={`/estudiantes/cursos/${courseId}/encuestas/${outcome.survey}`}>Responder la encuesta de promoción</Link>
    </>}
    {outcome.condition !== 'promoted' && surveysEnabled && feedbackSurvey && <Link className="student-text-action" href={`/estudiantes/cursos/${courseId}/encuestas/${feedbackSurvey}`}>Responder la encuesta de cierre</Link>}
  </section>;
}
