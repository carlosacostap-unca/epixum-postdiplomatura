import { notFound } from 'next/navigation';
import { Badge, Breadcrumbs, Card, CardContent, EmptyState, PageHeader } from '@/components/ui';
import FormattedDate from '@/components/FormattedDate';
import { getBedelAttendance } from '@/lib/course-bedel-data';
import { getErrorStatus } from '@/lib/errors';

export default async function BedelAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, attendance } = await getBedelAttendance(id).catch(error => { if (getErrorStatus(error) === 404) notFound(); throw error; });
  return <div className="page-container space-y-8">
    <Breadcrumbs items={[{ href: '/bedeles', label: 'Mis cursos' }, { href: `/bedeles/cursos/${id}`, label: course.title }, { label: 'Asistencias' }]} />
    <PageHeader eyebrow={course.title} title="Asistencias" description="Registros de asistencia de las instancias de revisión del curso." actions={<Badge>Solo lectura</Badge>} />
    {!attendance.length ? <EmptyState icon="fact_check" title="Sin asistencias registradas" description="Cuando se registre asistencia en las revisiones de este curso, podrás consultarla acá." /> :
      <Card><CardContent className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Planilla de asistencia de {course.title}</caption>
        <thead><tr>{['Estudiante', 'Instancia', 'Fecha', 'Asistencia'].map(label => <th key={label} scope="col" className="px-3 py-4">{label}</th>)}</tr></thead>
        <tbody>{attendance.map(row => { const student = row.expand?.student; return <tr key={row.id} className="border-t border-[var(--color-outline-variant)]">
          <th scope="row" className="px-3 py-4">{[student?.lastName, student?.firstName].filter(Boolean).join(', ') || student?.name || 'Estudiante'}</th>
          <td className="px-3 py-4">{row.expand?.review?.title || 'Revisión'}</td>
          <td className="px-3 py-4">{row.expand?.slot?.startsAt ? <FormattedDate date={row.expand.slot.startsAt} showTime /> : 'Sin fecha'}</td>
          <td className="px-3 py-4"><Badge tone={row.attendance === 'present' ? 'success' : 'warning'}>{row.attendance === 'present' ? 'Presente' : 'Ausente'}</Badge></td>
        </tr>; })}</tbody>
      </table></CardContent></Card>}
  </div>;
}
