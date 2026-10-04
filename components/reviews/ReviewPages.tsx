import Link from 'next/link';
import { Badge, Card, CardContent, EmptyState } from '@/components/ui';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { getCourseReviews, getReviewAgenda } from '@/lib/review-appointments-data';
import { ReviewError } from '@/lib/review-appointments';
import { ReviewAgenda } from './ReviewAgenda';
import { ReviewEditor } from './ReviewForms';

type Props = { courseId: string; mode: 'teacher' | 'student' };
function AccessMessage({ error }: { error: unknown }) {
  return <div className="page-container"><EmptyState icon="event_busy" title="Revisiones no disponibles" description={error instanceof ReviewError ? error.message : 'No pudimos cargar las revisiones. Verificá tu acceso al curso e intentá nuevamente.'} /></div>;
}
export async function ReviewsPage({ courseId, mode }: Props) {
  let data;
  try { data = await getCourseReviews(courseId, mode); } catch (error) { return <AccessMessage error={error} />; }
  const Context = mode === 'teacher' ? TeacherCourseContext : StudentCourseContext;
  const base = `/${mode === 'teacher' ? 'docentes' : 'estudiantes'}/cursos/${courseId}/revisiones`;
  return <div className="page-container space-y-8">
    <Context course={data.course} current="revisiones" title="Revisiones por turnos" description={mode === 'teacher' ? 'Organizá la agenda del equipo docente y acompañá cada intento hasta la aprobación.' : 'Reservá tu lugar, consultá las devoluciones y seguí tu avance en cada revisión.'} />
    {!data.reviews.length && <EmptyState icon="event_available" title="Todavía no hay revisiones" description={mode === 'teacher' ? 'Creá la primera revisión y luego agregá las franjas de atención.' : 'Las revisiones aparecerán cuando los docentes las creen.'} />}
    <div className="grid gap-4 md:grid-cols-2">{data.reviews.map(review => {
      const status = data.progress.find(p => p.id === review.id)?.status;
      return <Card key={review.id}><CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-[var(--color-primary)]">REVISIÓN {review.number}</p><Badge tone={status === 'passed' ? 'success' : review.open ? 'info' : 'neutral'}>{status === 'passed' ? 'Aprobada' : status === 'reserved' ? 'Tenés una reserva pendiente' : review.open ? 'Reservas abiertas' : 'Reservas cerradas'}</Badge></div><h2 className="text-xl font-bold">{review.title}</h2><p className="line-clamp-3 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{review.instructions || 'Consultá los horarios y el seguimiento de esta revisión.'}</p><Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={`${base}/${review.id}`}>{mode === 'teacher' ? 'Gestionar agenda y evaluaciones' : 'Ver turnos y devoluciones'} →</Link></CardContent></Card>;
    })}</div>
    {mode === 'teacher' && <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-6"><h2 className="mb-5 text-xl font-bold">Crear revisión</h2><ReviewEditor courseId={courseId} nextNumber={Math.max(0, ...data.reviews.map(r => r.number)) + 1} /></section>}
  </div>;
}
export async function ReviewDetailPage({ courseId, reviewId, mode }: Props & { reviewId: string }) {
  let data;
  try { data = await getReviewAgenda(courseId, reviewId, mode); } catch (error) { return <AccessMessage error={error} />; }
  const Context = mode === 'teacher' ? TeacherCourseContext : StudentCourseContext;
  return <div className="page-container space-y-8"><Context course={data.course} current="revisiones" title={`Revisión ${data.review.number} · ${data.review.title}`} description={mode === 'teacher' ? 'Gestioná los horarios de cualquier docente del curso y registrá los resultados.' : 'Una reserva pendiente por revisión. Podés volver a intentarlo hasta aprobar.'} /><ReviewAgenda data={data} mode={mode} /></div>;
}
