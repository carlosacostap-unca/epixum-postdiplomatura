import Link from 'next/link';
import { fiaCourseId, type getPendingFiaMakeup } from '@/lib/fia-makeup';

type Makeup = NonNullable<Awaited<ReturnType<typeof getPendingFiaMakeup>>>;
const format = (grade: number | null) => grade === null ? 'Ausente' : grade.toLocaleString('es-AR');

export function FiaMakeupNotice({ makeup }: { makeup: Makeup }) {
  const closed = Date.now() >= Date.parse('2026-11-24T21:00:00-03:00');
  return <section aria-label="Recuperatorio de Fundamentos de Inteligencia Artificial" className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-5">
    <h2 className="text-xl font-bold">Fundamentos de Inteligencia Artificial</h2>
    <p>Tenés que recuperar <strong>{makeup.subject}</strong>.</p>
    <dl className="flex flex-wrap gap-x-8 gap-y-2">
      <div><dt>Primer parcial</dt><dd className="font-bold">{format(makeup.first)}</dd></div>
      <div><dt>Segundo parcial</dt><dd className="font-bold">{format(makeup.second)}</dd></div>
    </dl>
    {closed ? <p>Los turnos del martes 24 de noviembre ya finalizaron.</p> : <p>Tu recuperatorio ya está publicado. El martes 24 de noviembre de 2026 podés rendirlo de <strong>08:00 a 09:00</strong> o de <strong>20:00 a 21:00</strong> (hora argentina). Elegí uno de los dos turnos. El examen se activa al comenzar cada turno y tenés un solo intento.</p>}
    {!closed && <p>
      {makeup.subject === 'ambos parciales'
        ? 'Antes de rendir el recuperatorio integral, completá las preparaciones de las unidades 1 a 5 y las simulaciones del primer y del segundo parcial. En el enlace podés consultar qué actividades te faltan.'
        : 'Revisá las preparaciones y simulaciones que te corresponden antes de rendir.'}
      {' '}Durante el examen necesitás mantener la cámara encendida.
    </p>}
    <Link className="student-text-action" href={`/estudiantes/cursos/${fiaCourseId}/parciales/iniciar/${makeup.examId}`}>Ver mi recuperatorio y sus requisitos</Link>
  </section>;
}
