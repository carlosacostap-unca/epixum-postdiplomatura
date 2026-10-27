'use client';
import { useState, useTransition, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { courseExamSchema, examDateInput, examLocalDate, examStatusLabels, type CourseExam, type CourseExamInput, type ExamSession } from '@/lib/course-exams';
import type { PracticeQuestion } from '@/lib/preparation';
import { saveExam } from '@/lib/actions-course-exams';
import { COURSE_EXAM_APPROVAL_RULES } from '@/lib/course-exam-grading';

const field = 'mt-2 w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-3';
export function CourseExamEditor({ courseId, exam, basePath }: { courseId: string; exam: CourseExam | null; basePath: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(exam?.title || '');
  const [description, setDescription] = useState(exam?.description || '');
  const [primaryOpens, setPrimaryOpens] = useState(examLocalDate(exam?.opensAt || ''));
  const [primaryCloses, setPrimaryCloses] = useState(examLocalDate(exam?.closesAt || ''));
  const [primaryQuestions, setPrimaryQuestions] = useState<PracticeQuestion[]>(exam?.questions || []);
  const [sessions, setSessions] = useState<ExamSession[]>(exam?.sessions || []);
  const [sessionId, setSessionId] = useState('primary');
  const activeSession = sessions.find(s => s.id === sessionId);
  const updateSession = (patch: Partial<ExamSession>) => setSessions(items => items.map(s => s.id === sessionId ? { ...s, ...patch } : s));
  const opens = activeSession ? examLocalDate(activeSession.opensAt) : primaryOpens;
  const closes = activeSession ? examLocalDate(activeSession.closesAt) : primaryCloses;
  const questions = activeSession?.questions || primaryQuestions;
  const setQuestions = (value: SetStateAction<PracticeQuestion[]>) => {
    if (sessionId === 'primary') setPrimaryQuestions(value);
    else setSessions(items => items.map(s => s.id === sessionId ? { ...s, questions: typeof value === 'function' ? value(s.questions) : value } : s));
  };
  const [status, setStatus] = useState<CourseExamInput['status']>(exam?.status || 'draft');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const update = (id: string, input: Partial<PracticeQuestion>) => setQuestions(items => items.map(q => q.id === id ? { ...q, ...input } : q));
  return <form className="space-y-6" onSubmit={e => {
    e.preventDefault(); setError('');
    const data = courseExamSchema.safeParse({ title, description, questions: primaryQuestions, sessions, status, opensAt: examDateInput(primaryOpens), closesAt: examDateInput(primaryCloses) });
    if (!data.success) { setError(data.error.issues[0].message); return; }
    start(async () => {
      const result = await saveExam(courseId, exam?.id || null, data.data);
      if (!result.success) { setError(result.error); return; }
      router.push(basePath); router.refresh();
    });
  }}>
    <fieldset disabled={pending} className="space-y-6">
      <Card><CardContent className="space-y-4">
        <label className="block font-bold">Título<input required maxLength={160} className={field} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="block font-bold">Instrucciones<textarea maxLength={2000} className={field} value={description} onChange={e => setDescription(e.target.value)} /></label>
        <label className="block font-bold">Estado<select className={field} value={status} onChange={e => setStatus(e.target.value as CourseExamInput['status'])}>{Object.entries(examStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <p>El borrador y el parcial archivado están ocultos para los alumnos. Un parcial publicado se activa y cierra según su programación.</p>
        <p>Las preguntas y sus opciones se mezclan automáticamente para cada intento nuevo. Cada alumno conserva ese orden al retomar. Los intentos ya iniciados mantienen su orden original.</p>
        <p>{COURSE_EXAM_APPROVAL_RULES}</p>
        <div className="space-y-3 border-t border-[var(--color-outline-variant)] pt-4">
          <h3 className="text-lg font-bold">Turnos alternativos</h3>
          <p>Un solo intento por alumno entre todos los turnos. Cada turno tiene su propio horario y preguntas distintas, con la misma cantidad de preguntas. Después del primer inicio se bloquea la edición de todos los turnos.</p>
          <label className="block font-bold">Turno que estás editando<select className={field} value={sessionId} onChange={e => setSessionId(e.target.value)}><option value="primary">Turno mañana</option>{sessions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <Button variant="secondary" disabled={sessions.length >= 3} onClick={() => {
            const id = crypto.randomUUID();
            setSessions(items => [...items, { id, label: `Turno ${items.length + 2}`, opensAt: '', closesAt: '', questions: [] }]);
            setSessionId(id);
          }}>Agregar turno alternativo</Button>
          {activeSession && <><label className="block font-bold">Nombre del turno<input required maxLength={80} className={field} value={activeSession.label} onChange={e => updateSession({ label: e.target.value })} /></label><Button variant="ghost" onClick={() => { if (window.confirm('¿Eliminar este turno y sus preguntas?')) { setSessions(items => items.filter(s => s.id !== sessionId)); setSessionId('primary'); } }}>Eliminar turno</Button></>}
          <p className="font-bold">Horario y preguntas de {activeSession?.label || 'Turno mañana'}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block font-bold">Activación<input type="datetime-local" className={field} value={opens} onChange={e => activeSession ? updateSession({ opensAt: examDateInput(e.target.value) }) : setPrimaryOpens(e.target.value)} required={status === 'published'} /></label>
          <label className="block font-bold">Desactivación y entrega automática<input type="datetime-local" className={field} value={closes} onChange={e => activeSession ? updateSession({ closesAt: examDateInput(e.target.value) }) : setPrimaryCloses(e.target.value)} required={status === 'published'} /></label>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">Horarios de Argentina (Buenos Aires, UTC−03:00). Podés dejar ambas fechas vacías mientras sea borrador. La cámara es obligatoria y se guarda una única foto inicial por intento nuevo, visible para administradores y docentes del curso en el detalle del alumno. Cada selección se guarda automáticamente y puede cambiarse antes de entregar. Un intento por alumno. Al llegar al cierre se entrega lo guardado, incluso si el alumno salió. Las preguntas omitidas suman cero. Una vez iniciado el primer intento no se puede editar el parcial.</p>
      </CardContent></Card>
      {questions.map((q, i) => <Card key={q.id}><CardContent className="space-y-4">
        <div className="flex justify-between gap-3"><h3 className="text-xl font-bold">Pregunta {i + 1}</h3><Button variant="ghost" onClick={() => { if (window.confirm('¿Eliminar esta pregunta?')) setQuestions(items => items.filter(item => item.id !== q.id)); }}>Eliminar pregunta {i + 1}</Button></div>
        <label className="block">Enunciado<textarea className={field} required maxLength={4000} value={q.prompt} onChange={e => update(q.id, { prompt: e.target.value })} /></label>
        <fieldset><legend>Opciones · marcá una correcta</legend>{q.options.map((o, j) => <div key={o.id} className="mt-3 flex items-center gap-3">
          <input type="radio" name={`correct-${q.id}`} checked={q.correctOptionId === o.id} aria-label={`Opción ${j + 1} correcta en pregunta ${i + 1}`} onChange={() => update(q.id, { correctOptionId: o.id })} />
          <input required maxLength={500} aria-label={`Opción ${j + 1} de pregunta ${i + 1}`} className={field} value={o.label} onChange={e => update(q.id, { options: q.options.map(item => item.id === o.id ? { ...item, label: e.target.value } : item) })} />
        </div>)}</fieldset>
        <label className="block">Explicación para la devolución<textarea className={field} maxLength={4000} value={q.explanation} onChange={e => update(q.id, { explanation: e.target.value })} /><span className="text-sm text-[var(--color-text-muted)]">El alumno podrá leerla después de la fecha y hora de cierre del parcial.</span></label>
      </CardContent></Card>)}
      <Button variant="secondary" disabled={questions.length >= 80} onClick={() => {
        const options = Array.from({ length: 4 }, () => ({ id: crypto.randomUUID(), label: '' }));
        setQuestions(items => [...items, { id: crypto.randomUUID(), prompt: '', options, correctOptionId: options[0].id, explanation: '' }]);
      }}>Agregar pregunta</Button>
      <p>{questions.length} de 80 preguntas en {activeSession?.label || 'Turno mañana'}</p>
      {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
      <Button type="submit" isPending={pending}>{status === 'draft' ? 'Guardar borrador' : status === 'published' ? 'Guardar y publicar parcial' : 'Archivar parcial'}</Button>
    </fieldset>
  </form>;
}
