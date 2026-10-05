'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { correctCourseAttendance, setCourseAttendance } from '@/lib/actions-course-attendance';
import { attendanceLabels, type AttendanceReport, type AttendanceStatus } from '@/lib/course-attendance';

function dateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value));
}
const inputClass = 'min-h-11 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] px-3 py-2';
const phaseLabels = { live: 'En vivo', closed: 'Finalizada', pending: 'Pendiente', untracked: 'Sin registro' };

export function AttendanceSheet({ courseId, enabled, report, readOnly = false }: { courseId: string; enabled: boolean; report: AttendanceReport; readOnly?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState<{ studentId: string; classId: string } | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const editor = useRef<HTMLDivElement>(null);
  const selectedRow = report.rows.find(row => row.student.id === selection?.studentId);
  const selectedClass = report.classes.find(cls => cls.id === selection?.classId);
  const selectedCell = selection && selectedRow?.cells[selection.classId];
  const columns = report.classes.filter(cls => !classFilter || cls.id === classFilter);
  const query = search.trim().toLocaleLowerCase('es');
  const rows = report.rows.filter(row => `${row.student.name} ${row.student.email}`.toLocaleLowerCase('es').includes(query));

  function toggle() {
    if (readOnly) return;
    setError(''); setMessage('');
    startTransition(async () => {
      try {
        const result = await setCourseAttendance(courseId, !enabled);
        if (!result.success) { setError(result.error); return; }
        setMessage(enabled ? 'Asistencia desactivada para las próximas sesiones.' : 'Asistencia activada para las próximas sesiones.');
        router.refresh();
      } catch { setError('No pudimos conectarnos. Intentá nuevamente.'); }
    });
  }
  function correct(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly || !selection) return;
    setError(''); setMessage('');
    startTransition(async () => {
      try {
        const result = await correctCourseAttendance(courseId, { ...selection, status });
        if (!result.success) { setError(result.error); return; }
        setSelection(null); setMessage('Corrección guardada. El autor y la fecha quedaron registrados.'); router.refresh();
      } catch { setError('No pudimos conectarnos. Intentá nuevamente.'); }
    });
  }
  return <div className="space-y-6">
    <Card><CardContent className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Asistencia automática</h2><p className="mt-1">{enabled ? 'Activada' : 'Desactivada'} para nuevas sesiones en vivo.</p></div>
        {!readOnly && <Button onClick={toggle} disabled={pending} variant={enabled ? 'secondary' : 'primary'}>{enabled ? 'Desactivar asistencia' : 'Activar asistencia'}</Button>}</div>
      <p className="text-sm text-[var(--color-on-surface-variant)]">El ingreso en vivo marca presente. El repaso posterior no cuenta. Los cambios de configuración se aplican al iniciar una nueva sesión; las sesiones ya iniciadas conservan su configuración.</p>
    </CardContent></Card>
    {error && <p role="alert" className="rounded-lg border border-[var(--color-error)] p-4 text-[var(--color-error)]">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-[var(--color-surface-container)] p-4">{message}</p>}
    <div ref={editor} tabIndex={-1}>
      {!readOnly && selectedCell && selectedClass && selectedRow && <Card><CardContent>
        <form onSubmit={correct} className="space-y-4">
          <h2 className="text-xl font-bold">Corregir asistencia</h2>
          <p>{selectedRow.student.name} · {selectedClass.title}</p>
          <p className="text-sm">La corrección tiene prioridad sobre el registro automático, incluso si el alumno vuelve a ingresar.</p>
          <label className="flex max-w-sm flex-col gap-2">Estado de asistencia<select className={inputClass} value={status} onChange={event => setStatus(event.target.value as AttendanceStatus)} disabled={pending}><option value="present">Presente</option><option value="absent">Ausente</option></select></label>
          <div className="flex flex-wrap gap-3"><Button type="submit" isPending={pending}>Guardar corrección</Button><Button variant="secondary" onClick={() => setSelection(null)} disabled={pending}>Cancelar</Button></div>
          {selectedCell.corrections.length > 0 && <details><summary className="cursor-pointer py-2 font-semibold">Historial de correcciones ({selectedCell.corrections.length})</summary><ul className="space-y-2 text-sm">{selectedCell.corrections.map(item => <li key={item.id}>{attendanceLabels[item.status]} · {item.actorName} · {dateTime(item.created)}</li>)}</ul></details>}
        </form>
      </CardContent></Card>}
    </div>
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex w-full min-w-0 flex-col gap-2 font-semibold sm:w-auto sm:flex-1">Buscar alumno<input className={inputClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Apellido, nombre o email" /></label>
      <label className="flex w-full max-w-full flex-col gap-2 font-semibold sm:w-auto">Clase<select className={`${inputClass} max-w-full`} value={classFilter} onChange={event => setClassFilter(event.target.value)}><option value="">Todas las clases</option>{report.classes.map(cls => <option key={cls.id} value={cls.id}>{cls.title}</option>)}</select></label>
      <Button variant="secondary" isPending={pending} onClick={() => startTransition(() => router.refresh())}>Actualizar planilla</Button>
    </div>
    <p className="text-sm text-[var(--color-on-surface-variant)]">Los ausentes se determinan al finalizar la clase. Pendiente indica que todavía no terminó; Sin registro indica que no se tomó asistencia; No corresponde indica una matrícula posterior o no vigente para esa clase. Horarios de Argentina.</p>
    {!columns.length ? <p className="rounded-lg bg-[var(--color-surface-container)] p-6">Todavía no hay clases asociadas a materiales interactivos.</p> : !rows.length ? <p className="rounded-lg bg-[var(--color-surface-container)] p-6">No hay alumnos para mostrar.</p> :
      <div className="max-w-full overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]" role="region" aria-label="Planilla de asistencia" tabIndex={0}>
        <table className="w-full text-left text-sm"><caption className="sr-only">Asistencia por alumno y clase interactiva</caption>
          <thead className="bg-[var(--color-surface-container)]"><tr><th scope="col" className="min-w-52 p-4">Alumno</th>{columns.map(cls => <th scope="col" className="min-w-52 p-4" key={cls.id}><span className="block">{cls.title}</span><span className="mt-1 block text-xs font-normal">{phaseLabels[cls.phase]}</span></th>)}<th scope="col" className="p-4">Totales</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.student.id} className="border-t border-[var(--color-outline-variant)]"><th scope="row" className="p-4 align-top font-semibold"><span className="block">{row.student.name}</span><span className="mt-1 block break-all text-xs font-normal text-[var(--color-on-surface-variant)]">{row.student.email}</span></th>
            {columns.map(cls => { const cell = row.cells[cls.id]; return <td className="p-4 align-top" key={cls.id}>
              <span className={`font-bold ${cell.status === 'present' ? 'text-[var(--color-success)]' : cell.status === 'absent' ? 'text-[var(--color-error)]' : 'text-[var(--color-on-surface-variant)]'}`}>{attendanceLabels[cell.status]}</span>
              {cell.firstJoinedAt && <span className="mt-1 block text-xs">Ingreso: {dateTime(cell.firstJoinedAt)}</span>}
              {cell.corrections[0] && <span className="mt-1 block text-xs">Corregido por {cell.corrections[0].actorName}<br />{dateTime(cell.corrections[0].created)}</span>}
              {!readOnly && cell.editable && <button className="mt-2 min-h-11 font-semibold text-[var(--color-primary)] disabled:opacity-50" disabled={pending} aria-label={`Corregir ${row.student.name}, ${cls.title}`} onClick={() => {
                setSelection({ studentId: row.student.id, classId: cls.id }); setStatus(cell.status === 'absent' ? 'absent' : 'present'); setError(''); setMessage('');
                requestAnimationFrame(() => { editor.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); editor.current?.focus(); });
              }}>Corregir</button>}
            </td>; })}
            <td className="whitespace-nowrap p-4 align-top">Presentes: {columns.filter(cls => row.cells[cls.id].status === 'present').length}<br />Ausentes: {columns.filter(cls => row.cells[cls.id].status === 'absent').length}</td>
          </tr>)}</tbody>
        </table>
      </div>}
  </div>;
}
