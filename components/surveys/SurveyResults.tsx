import { Card, CardContent, EmptyState, StatCard } from '@/components/ui';
import type { CourseSurvey, SurveyAnswers, SurveyQuestion, SurveyResults as Results } from '@/lib/course-surveys';

function answerLabel(q: SurveyQuestion, answers: SurveyAnswers) {
  const answer = answers[q.id];
  if (answer === undefined) return 'Sin respuesta';
  if (q.type === 'single' || q.type === 'multiple') return (Array.isArray(answer) ? answer : [answer]).map(value => q.options.find(o => o.id === value)?.label || String(value)).join(', ');
  return String(answer);
}

export function SurveyResults({ survey, results }: { survey: CourseSurvey; results: Results }) {
  return <section aria-label="Resultados de la encuesta" className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-bold">Resultados</h2><StatCard label="Respuestas recibidas" value={results.total} /></div>
    <p className="text-sm text-[var(--color-on-surface-variant)]">{survey.anonymous ? 'Resultados anónimos: cada pregunta se muestra por separado, sin participantes ni orden de envío.' : 'Respuestas identificadas, visibles para el equipo docente y la administración.'} Los porcentajes se calculan sobre quienes respondieron cada pregunta. En selección múltiple pueden sumar más del 100 %.</p>
    {!results.total ? <EmptyState icon="poll" title="Todavía no hay respuestas" description="Los resultados aparecerán aquí cuando los alumnos participen." /> : results.questions.map((q, index) => <Card key={q.id}><CardContent className="space-y-4">
      <div><h3 className="break-words text-lg font-bold">{index + 1}. {q.title}</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{q.answered} de {results.total} respuestas</p></div>
      {q.type === 'text' ? q.texts.length ? <ul className="space-y-3">{q.texts.map((text, i) => <li key={i} className="whitespace-pre-wrap break-words rounded-xl bg-[var(--color-surface-container)] p-4 text-sm">{text}</li>)}</ul> : <p className="text-sm text-[var(--color-on-surface-variant)]">Sin respuestas de texto.</p>
        : <ul className="space-y-4">{q.options.map(o => <li key={o.label}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span className="break-words">{o.label}</span><strong>{o.count} ({o.percent} %)</strong></div><div role="meter" aria-label={o.label} aria-valuenow={o.percent} aria-valuemin={0} aria-valuemax={100} className="h-3 overflow-hidden rounded-full bg-[var(--color-surface-container-highest)]"><div style={{ width: `${o.percent}%` }} className="h-full rounded-full bg-[var(--color-primary)]" /></div></li>)}</ul>}
    </CardContent></Card>)}
    {!survey.anonymous && results.individuals.length > 0 && <div className="space-y-4"><h3 className="text-xl font-bold">Respuestas por alumno</h3>{results.individuals.map((person, index) => <details key={index} className="rounded-xl border border-[var(--color-outline-variant)] p-5"><summary className="cursor-pointer font-bold">{person.name}</summary><dl className="mt-5 space-y-4">{survey.questions.map(q => <div key={q.id}><dt className="font-bold">{q.title}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--color-on-surface-variant)]">{answerLabel(q, person.answers)}</dd></div>)}</dl></details>)}</div>}
  </section>;
}
