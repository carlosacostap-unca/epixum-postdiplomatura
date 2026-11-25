import Link from 'next/link';
import { fiaCourseId, type getPendingFiaMakeup } from '@/lib/fia-makeup';
import { fiaSecondMakeupRules } from '@/lib/course-exam-grading';
import { examDateLabel, examLocalDate, examSchedule } from '@/lib/course-exams';

type Makeup = NonNullable<Awaited<ReturnType<typeof getPendingFiaMakeup>>>;
const format = (grade: number | null) => grade === null ? 'Ausente' : grade.toLocaleString('es-AR');

export function FiaMakeupNotice({ makeup }: { makeup: Makeup }) {
  const schedule = examSchedule(makeup.schedule);
  const remaining = schedule.filter(turn => Date.parse(turn.closesAt.replace(' ', 'T')) > Date.now());
  return <section aria-label="Recuperatorio de Fundamentos de Inteligencia Artificial" className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-5">
    <h2 className="text-xl font-bold">Fundamentos de Inteligencia Artificial</h2>
    <p>Tenés que recuperar <strong>{makeup.subject}</strong>.</p>
    <dl className="flex flex-wrap gap-x-8 gap-y-2">
      <div><dt>Primer parcial</dt><dd className="font-bold">{format(makeup.first)}</dd></div>
      <div><dt>Segundo parcial</dt><dd className="font-bold">{format(makeup.second)}</dd></div>
    </dl>
    {makeup.examId === 'fiarec2nov24001' && <p>{fiaSecondMakeupRules(makeup.first)}</p>}
    {remaining.length ? <>
      <p>{remaining.length > 1 ? 'Elegí uno de los turnos.' : 'Rendí en el horario indicado.'} Tenés un solo intento. Horarios de Argentina.</p>
      <ul className="list-disc pl-5">{remaining.map(turn => <li key={turn.id}>{examDateLabel(turn.opensAt)} a {examLocalDate(turn.closesAt).slice(11, 16)}</li>)}</ul>
    </> : <p>Los turnos del recuperatorio ya finalizaron.</p>}
    {remaining.length > 0 && <p>
      {makeup.subject === 'ambos parciales'
        ? 'Antes de rendir el recuperatorio integral, completá las preparaciones de las unidades 1 a 5 y las simulaciones del primer y del segundo parcial. En el enlace podés consultar qué actividades te faltan.'
        : 'Revisá las preparaciones y simulaciones que te corresponden antes de rendir.'}
      {' '}Durante el examen necesitás mantener la cámara encendida.
    </p>}
    <Link className="student-text-action" href={`/estudiantes/cursos/${fiaCourseId}/parciales/iniciar/${makeup.examId}`}>Ver mi recuperatorio y sus requisitos</Link>
  </section>;
}
