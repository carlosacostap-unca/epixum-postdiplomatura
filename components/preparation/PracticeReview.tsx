import { Card, CardContent } from '@/components/ui';
import type { PracticeResult } from '@/lib/preparation';

export function PracticeReview({ result, audience = 'student' }: { result: PracticeResult; audience?: 'teacher' | 'student' }) {
  return <div className="space-y-5">
    <Card><CardContent><h2 className="text-2xl font-bold">Resultado de práctica</h2><p className="my-3 text-3xl font-bold text-[var(--color-primary)]">{result.correct} de {result.total} correctas · {result.percentage}%</p><p>{audience === 'teacher' ? 'Resultado para seguimiento docente. No modifica las notas oficiales del alumno.' : 'No modifica tus notas oficiales. Revisá las explicaciones y volvé a practicar cuando quieras.'}</p></CardContent></Card>
    {result.review.map((item, i) => <Card key={item.question.id}><CardContent className="space-y-4">
      <p className="font-bold">Pregunta {i + 1} · {item.correct ? 'Correcta' : item.selectedOptionId ? 'Para revisar' : 'Sin responder'}</p>
      <h3 className="whitespace-pre-wrap text-lg font-bold">{item.question.prompt}</h3>
      <ul className="space-y-2">{item.question.options.map(o => <li key={o.id} className={`rounded-lg border p-3 ${o.id === item.question.correctOptionId ? 'border-[var(--color-primary)]' : 'border-[var(--color-outline-variant)]'}`}>
        <span className="whitespace-pre-wrap">{o.label}</span>{o.id === item.selectedOptionId && <strong className="ml-2">· {audience === 'teacher' ? 'Respuesta del alumno' : 'Tu respuesta'}</strong>}{o.id === item.question.correctOptionId && <strong className="ml-2 text-[var(--color-primary)]">· Respuesta correcta</strong>}
      </li>)}</ul>
      {item.question.explanation && <div><h4 className="font-bold">Explicación</h4><p className="mt-2 whitespace-pre-wrap">{item.question.explanation}</p></div>}
    </CardContent></Card>)}
  </div>;
}
