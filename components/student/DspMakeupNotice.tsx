import Link from 'next/link';
import { examLocalDate, examSchedule } from '@/lib/course-exams';
import type { getPendingDspMakeup } from '@/lib/course-makeup-notice';

type Makeup = NonNullable<Awaited<ReturnType<typeof getPendingDspMakeup>>>;
const date = new Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeZone: 'America/Argentina/Buenos_Aires' });
const format = (grade: number | null) => grade === null ? 'Ausente' : grade.toLocaleString('es-AR');

export function DspMakeupNotice({ courseId, makeup }: { courseId: string; makeup: Makeup }) {
  const turns = examSchedule(makeup.schedule);
  const remaining = turns.filter(turn => Date.parse(turn.closesAt.replace(' ', 'T')) > Date.now());
  const integral = makeup.subject === 'ambos parciales';
  const title = integral ? 'Recuperatorio integral' : 'Recuperatorio del primer parcial';
  return <section aria-label={title} className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-5">
    <h2 className="text-xl font-bold">{title}</h2>
    {!integral && <dl className="flex flex-wrap gap-x-8 gap-y-2">
      <div><dt>Nota del primer parcial</dt><dd className="font-bold">{format(makeup.first)}</dd></div>
      <div><dt>Nota del segundo parcial</dt><dd className="font-bold">{format(makeup.second)}</dd></div>
    </dl>}
    {remaining.length > 0 ? <>
      <p>Tu recuperatorio está publicado. {remaining.length > 1 ? 'Elegí uno de los turnos' : 'Podés rendir en el turno que queda'}. Los horarios son de Argentina y tenés un solo intento.</p>
      <p>{integral ? 'Antes de rendir, completá las preparaciones de las unidades 1 a 6 y las dos simulaciones.' : 'Antes de rendir, completá las preparaciones de las unidades 1 a 4 y la simulación del primer parcial.'} Consultá qué actividades te faltan en el enlace al recuperatorio.</p>
      <ul className="list-disc pl-5">
        {remaining.map(turn => <li key={turn.id}>
          {date.format(new Date(turn.opensAt.replace(' ', 'T')))}, de <strong>{examLocalDate(turn.opensAt).slice(11, 16)} a {examLocalDate(turn.closesAt).slice(11, 16)}</strong>
        </li>)}
      </ul>
    </> : <p>Los turnos del recuperatorio ya finalizaron.</p>}
    <Link className="student-text-action" href={`/estudiantes/cursos/${courseId}/parciales/iniciar/${makeup.examId}`}>{integral ? 'Ver mi recuperatorio integral' : 'Ver mi recuperatorio'}</Link>
  </section>;
}
