'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { beginExam, examCamera, readExam, saveExamAnswer, sendExam } from '@/lib/actions-course-exams';
import { examAvailability, examDateLabel, examSchedule, type CourseExamSummary, type ExamView } from '@/lib/course-exams';
import { useWebcam } from '@/components/preparation/useWebcam';
import { WebcamPanel } from '@/components/preparation/WebcamPanel';
import { CourseExamFeedback } from './CourseExamFeedback';
import { COURSE_EXAM_APPROVAL_RULES } from '@/lib/course-exam-grading';

export function CourseExamStart({ courseId, exam }: { courseId: string; exam: Omit<CourseExamSummary, 'course'> }) {
  const router = useRouter();
  const camera = useWebcam();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const photo = useRef<Blob | null>(null);
  return <div className="space-y-5"><h2 className="text-2xl font-bold">{exam.title}</h2><p className="whitespace-pre-wrap">{exam.description}</p><p>{examAvailability(exam)}</p>{examSchedule(exam).map(s => <p key={s.id}>{exam.sessions?.length ? `${s.label} · ` : ''}Desde {examDateLabel(s.opensAt)} hasta {examDateLabel(s.closesAt)} (Argentina)</p>)}
    {exam.sessions?.length ? <p>Al comenzar, rendís la versión del turno que esté activo. Tenés un único intento entre todos los turnos; no podés volver a rendir en otro horario.</p> : null}
    <p>Un intento por alumno. Podés navegar sin responder y cambiar tus respuestas; cada selección se guarda en tu cuenta. El plazo sigue corriendo aunque salgas. Al cierre se entrega lo guardado. La nota y la devolución completa se habilitan después del cierre, aunque entregues antes.</p>
    <p>El orden de las preguntas y sus opciones se mezcla al iniciar el intento y se conserva cuando lo retomás.</p>
    <p>{COURSE_EXAM_APPROVAL_RULES}</p>
    <WebcamPanel camera={camera} />
    <label className="flex items-start gap-3"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1 size-5 shrink-0" /><span>Entiendo que se guardará una foto inicial de mi cámara, visible sólo para administradores y docentes del curso, y que debo mantener la cámara activa mientras respondo.</span></label>
    <Button disabled={!camera.ready || !accepted} isPending={pending} pendingLabel="Guardando foto e iniciando…" onClick={async () => {
      if (!accepted || !camera.isLive()) return;
      setPending(true); setError('');
      try {
        photo.current ??= await camera.capture();
        if (!camera.isLive()) throw new Error('La cámara se apagó. Reactivala antes de comenzar.');
        const form = new FormData(); form.set('photo', photo.current, 'foto-inicial.jpg'); form.set('accepted', 'true');
        const result = await beginExam(courseId, exam.id, true, form);
        if (!result.success) { setError(result.error); setPending(false); return; }
        router.push(`/estudiantes/cursos/${courseId}/parciales/intentos/${result.data}`);
      } catch { setError('No pudimos tomar la foto o iniciar el parcial. Revisá la cámara y volvé a intentar.'); setPending(false); }
    }}>Tomar foto e iniciar parcial</Button>{error && <p role="alert">{error}</p>}
  </div>;
}

export function CourseExamRunner({ courseId, initial }: { courseId: string; initial: ExamView }) {
  const [view, setView] = useState(initial);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [unsaved, setUnsaved] = useState<{ questionId: string; optionId: string; mutationId: string } | null>(null);
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((Date.parse(initial.deadline.replace(' ', 'T')) - initial.serverNow) / 1000)));
  const mountedAt = useRef<number | null>(null);
  const busy = useRef(false);
  const camera = useWebcam(!view.result, true);
  const { ready, isLive } = camera;
  useEffect(() => {
    if (view.result) return;
    let cancelled = false; let reporting = false;
    const report = async () => {
      if (reporting) return;
      reporting = true;
      try { const result = await examCamera(courseId, initial.id, isLive()); if (!cancelled) setVerified(result.success && result.data && isLive()); }
      catch { if (!cancelled) setVerified(false); }
      finally { reporting = false; }
    };
    void report(); const timer = window.setInterval(() => { void report(); }, 8000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [ready, isLive, courseId, initial.id, view.result]);
  useEffect(() => {
    if (view.result?.feedbackAvailable) return;
    mountedAt.current ??= performance.now();
    const tick = () => setRemaining(Math.max(0, Math.ceil((Date.parse(initial.deadline.replace(' ', 'T')) - initial.serverNow - (performance.now() - mountedAt.current!)) / 1000)));
    const timer = window.setInterval(tick, 1000); window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [initial.deadline, initial.serverNow, view.result]);
  useEffect(() => {
    if (view.result) return;
    const warn = (e: BeforeUnloadEvent) => { if (busy.current || unsaved) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved, view.result]);
  useEffect(() => {
    if (remaining || view.result?.feedbackAvailable) return;
    let cancelled = false;
    const refresh = async () => {
      try { const result = await readExam(courseId, initial.id); if (!cancelled) { if (result.success) { setView(result.data); if (result.data.result) { setUnsaved(null); setError(''); } } else setError(result.error); } }
      catch { if (!cancelled) setError('Se alcanzó el cierre. Estamos recuperando la entrega con las respuestas guardadas.'); }
    };
    void refresh(); const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [remaining, view.result?.feedbackAvailable, courseId, initial.id]);
  async function save(input: NonNullable<typeof unsaved>) {
    if (busy.current || !camera.isLive() || !verified || !remaining) return;
    busy.current = true; setPending(true); setError(''); setUnsaved(input);
    try {
      const result = await saveExamAnswer(courseId, initial.id, input);
      if (result.success) { setView(result.data); setUnsaved(null); }
      else setError(result.error);
    } catch { setError('No se guardó esta selección. Revisá la conexión y usá Reintentar guardado.'); }
    finally { busy.current = false; setPending(false); }
  }
  if (view.result) return <div className="space-y-5"><Card><CardContent className="space-y-3"><h2 className="text-2xl font-bold">Parcial entregado</h2><p>{view.result.reason === 'expired' ? 'Entrega automática por cierre del horario.' : 'La entrega se guardó correctamente.'}</p><p>Finalización: {examDateLabel(view.result.finishedAt)} (Argentina)</p>{!view.result.feedbackAvailable && <><p>La nota y la devolución completa estarán disponibles a partir del cierre: {examDateLabel(view.deadline)} (Argentina).</p><p>Podés volver más tarde. Esta pantalla se actualizará automáticamente al llegar el horario de cierre.</p></>}{error && <p role="alert">{error}</p>}</CardContent></Card>{view.result.feedbackAvailable && <CourseExamFeedback result={view.result} />}</div>;
  const question = view.questions[index];
  return <div className="space-y-5">
    <Card><CardContent><p role="timer" aria-label="Tiempo restante" className="text-3xl font-bold">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p><p>Cierre: {examDateLabel(view.deadline)} (Argentina). El plazo continúa aunque salgas.</p><p>Pregunta {index + 1} de {view.questions.length} · {Object.keys(view.selected).length} respuestas guardadas</p><p role="status">{pending ? 'Guardando selección…' : unsaved ? 'Hay una selección sin guardar.' : 'Todas tus selecciones están guardadas.'}</p></CardContent></Card>
    <WebcamPanel camera={camera} />
    {camera.ready && !verified && <p role="status">Verificando la cámara…</p>}
    <nav aria-label="Preguntas del parcial" className="flex flex-wrap gap-2">{view.questions.map((q, i) => <Button disabled={pending || !!unsaved} key={q.id} variant={index === i ? 'primary' : 'secondary'} aria-current={index === i ? 'step' : undefined} aria-label={`Pregunta ${i + 1}${view.selected[q.id] ? ', respondida' : ', sin responder'}`} onClick={() => setIndex(i)}>{i + 1}{view.selected[q.id] ? ' ✓' : ''}</Button>)}</nav>
    {question && <Card><CardContent><fieldset disabled={pending || !!unsaved || !remaining || !ready || !verified} className="space-y-4"><legend className="mb-4 whitespace-pre-wrap text-lg font-bold">{question.prompt}</legend>{question.options.map(o => <label className="flex items-start gap-3 rounded-xl border border-[var(--color-outline-variant)] p-4" key={o.id}><input type="radio" name={question.id} checked={(unsaved?.questionId === question.id ? unsaved.optionId : view.selected[question.id]) === o.id} onChange={() => { void save({ questionId: question.id, optionId: o.id, mutationId: crypto.randomUUID() }); }} /><span>{o.label}</span></label>)}</fieldset></CardContent></Card>}
    <p>Podés pasar a otra pregunta sin responder. Cada opción se guarda al seleccionarla y puede cambiarse hasta entregar. Las incorrectas y omitidas suman cero. La nota y la devolución se habilitan después del cierre.</p>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
    {unsaved && <Button disabled={pending || !ready || !verified || !remaining} onClick={() => { void save(unsaved); }}>Reintentar guardado</Button>}
    <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={index === 0 || pending || !!unsaved} onClick={() => setIndex(i => i - 1)}>Pregunta anterior</Button><Button variant="secondary" disabled={index === view.questions.length - 1 || pending || !!unsaved} onClick={() => setIndex(i => i + 1)}>Siguiente pregunta</Button>
      <Button disabled={pending || !!unsaved || !remaining} onClick={async () => {
        if (busy.current || !window.confirm(`¿Entregar el parcial? Quedan ${view.questions.length - Object.keys(view.selected).length} preguntas sin responder. La entrega es definitiva.`)) return;
        busy.current = true; setPending(true); setError('');
        try { const result = await sendExam(courseId, initial.id); if (result.success) { setView(v => ({ ...v, result: result.data })); } else setError(result.error); }
        catch { setError('No pudimos confirmar la entrega. Volvé a intentar.'); }
        finally { busy.current = false; setPending(false); }
      }}>Entregar parcial</Button></div>
  </div>;
}
