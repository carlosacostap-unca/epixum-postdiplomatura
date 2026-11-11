import Link from 'next/link';
import type { ExamRequirementProgress } from '@/lib/course-exam-requirements';

export function CourseExamRequirements({ courseId, requirements }: { courseId: string; requirements: ExamRequirementProgress[] }) {
  if (!requirements.length) return null;
  const count = requirements.filter(item => item.completed).length;
  return <section aria-label="Requisitos para rendir" className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
    <h3 className="font-bold">Requisitos para rendir · {count} de {requirements.length} cumplidos</h3>
    <p>{count === requirements.length ? 'Todos los requisitos cumplidos. Podrás comenzar dentro del horario de un turno.' : count ? 'Requisitos parcialmente cumplidos. Completá las actividades pendientes para poder comenzar.' : 'Todavía no cumpliste los requisitos. Finalizá las tres actividades para poder comenzar.'}</p>
    <ul className="space-y-2">{requirements.map(item => <li key={item.quizId}><strong>{item.completed ? 'Cumplido' : 'Pendiente'}</strong> · {item.label}{!item.completed && <> · <Link className="font-bold underline" href={`/estudiantes/cursos/${courseId}/preparacion/iniciar/${item.quizId}`}>Realizar {item.label.toLocaleLowerCase('es')}</Link></>}</li>)}</ul>
    <p>Se cuenta al menos un intento finalizado por actividad, sin nota mínima. Iniciar una actividad no alcanza. Si completás lo pendiente durante un turno, dispondrás solo del tiempo restante hasta su cierre.</p>
  </section>;
}
