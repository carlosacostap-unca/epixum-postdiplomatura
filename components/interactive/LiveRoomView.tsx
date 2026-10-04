'use client';
import { useId, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { screenTypeLabels } from '@/lib/interactive-material';
import type { LiveCommand, LiveState, PublicScreen } from '@/lib/live-interactive-contract';
import { ContentWindow } from './ContentWindow';
import { TeacherScript } from './TeacherScript';

function ScreenBody({ screen }: { screen: PublicScreen }) {
  return <div className="space-y-5">
    <Badge>{screenTypeLabels[screen.type]}</Badge>
    <h2 className="font-headline text-2xl font-bold leading-tight sm:text-3xl">{screen.title}</h2>
    {screen.body && <div className="reading-content prose prose-invert max-w-none break-words"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a> }}>{screen.body}</ReactMarkdown></div>}
  </div>;
}

function StudentActivity({ state, pending, send }: { state: LiveState; pending: boolean; send: (command: LiveCommand) => Promise<boolean> }) {
  const [answer, setAnswer] = useState('');
  const answerId = useId();
  const screen = state.session.screen;
  const saved = state.ownAnswer?.answer;
  const disabled = pending || saved !== undefined || !state.session.activityOpen || state.session.status !== 'live';
  if (screen.type === 'content') return null;
  return <form className="mt-7 space-y-4" onSubmit={async (event) => { event.preventDefault(); await send({ kind: 'answer', answer, screenId: screen.id, revision: state.session.revision }); }}>
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="mb-3 font-semibold">{screen.type === 'short-answer' ? 'Tu respuesta' : 'Elegí una opción'}</legend>
      {screen.type === 'short-answer' ? <><label htmlFor={answerId} className="sr-only">Tu respuesta</label><textarea id={answerId} rows={4} required maxLength={screen.maxLength} value={saved ?? answer} onChange={(e) => setAnswer(e.target.value)} className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4" /><p className="text-sm text-[var(--color-text-muted)]">{(saved ?? answer).length} / {screen.maxLength} caracteres</p></> : screen.options.map((option) => <label key={option.id} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 has-checked:border-[var(--color-primary)]">
        <input type="radio" name={answerId} required value={option.id} checked={(saved ?? answer) === option.id} onChange={() => setAnswer(option.id)} className="size-5 shrink-0" /><span className="break-words">{option.label}</span>
      </label>)}
    </fieldset>
    {saved !== undefined ? <p role="status" className="rounded-xl bg-[var(--color-surface-container-high)] p-4">Tu respuesta quedó guardada. Sólo el equipo docente puede consultarla.</p> : <>
      <Button type="submit" disabled={disabled || !answer.trim()} isPending={pending}>Enviar respuesta</Button>
      <p className="text-sm text-[var(--color-text-muted)]">{state.session.status === 'closed' ? 'La sesión finalizó.' : state.session.activityOpen ? 'Podés enviar una sola respuesta. No genera una calificación.' : 'Esperá a que el docente abra la actividad.'}</p>
    </>}
  </form>;
}


interface LiveRoomViewProps {
  state: LiveState;
  results: string;
  setResults: (value: string) => void;
  send: (command: LiveCommand) => Promise<boolean>;
  pending?: boolean;
  connected?: boolean;
  connectionError?: string;
  error?: string;
  refresh?: () => Promise<void>;
  link?: string;
  simulation?: boolean;
  compact?: boolean;
}

// Presentation only. Live and simulated transports are supplied by their parents.
export function LiveRoomView({ state, results, setResults, send, pending = false, connected = true, connectionError = '', error = '', refresh = async () => {}, link = '', simulation = false, compact = false }: LiveRoomViewProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const active = state.session.status === 'live';
  const session = state.session;
  const screen = session.screen;
  const teacher = state.role === 'teacher' ? state : null;
  const teacherScreen = teacher?.material.screens.find((item) => item.id === screen.id);
  const recent = teacher?.participants.filter((p) => state.serverTime - Date.parse(p.updated) < 45_000) || [];
  const selected = teacher?.material.screens.find((s) => s.id === teacher.resultsScreenId);
  const controlDisabled = pending || !active || !teacher?.canControl || Boolean(connectionError);
  return <div className="space-y-6">
    <header className="space-y-3">
      <div className="flex flex-wrap gap-2"><Badge tone={active ? 'success' : 'neutral'}>{simulation ? (active ? 'Simulación activa' : 'Simulación finalizada') : (active ? 'Sesión en vivo' : 'Sesión finalizada')}</Badge>{active && <Badge tone={connected && !connectionError ? 'success' : 'warning'}>{simulation ? 'Conexión simulada' : connected && !connectionError ? 'Conectado' : 'Reconectando · actualización periódica'}</Badge>}{teacher && <Badge>Panel docente · resultados privados</Badge>}</div>
      <h1 className="font-headline text-3xl font-bold">{session.title}</h1><p className="text-[var(--color-text-muted)]">{session.classTitle}</p>
    </header>
    {teacher && <ContentWindow title={session.title} mode="projection">
      {simulation && <Badge tone="warning">Simulación · proyección</Badge>}
      {active && !simulation && (!connected || connectionError) && <p role="status" className="text-sm text-[var(--color-text-muted)]">Reconectando con la clase…</p>}
      {!active && <p role="status" className="rounded-xl bg-[var(--color-surface-container-high)] p-4">{simulation ? 'El ensayo terminó.' : 'La sesión finalizó.'}</p>}
      <Card><CardContent className="min-h-72">
        <ScreenBody screen={screen} />
        {'options' in screen && <ul className="mt-6 space-y-3">{screen.options.map((option) => <li key={option.id} className="rounded-xl border border-[var(--color-outline-variant)] p-4">{option.label}</li>)}</ul>}
        {active && screen.type !== 'content' && <p role="status" className="mt-6 text-[var(--color-text-muted)]">{session.activityOpen ? 'Actividad abierta. Respondé desde tu dispositivo.' : 'Esperá a que el docente abra la actividad.'}</p>}
      </CardContent></Card>
    </ContentWindow>}
    {!teacher && <ContentWindow title={session.title}>
      {simulation && <Badge tone="warning">Simulación · alumno ficticio</Badge>}
      {active && !simulation && (!connected || connectionError) && <p role="status" className="text-sm text-[var(--color-text-muted)]">Reconectando · actualización periódica</p>}
      {(error || connectionError) && <div role="alert" className="rounded-xl border border-[var(--color-error)] p-4"><p>{error || connectionError}</p>{!simulation && <Button variant="ghost" onClick={() => void refresh()}>Actualizar ahora</Button>}</div>}
      {!active && <p role="status" className="rounded-xl bg-[var(--color-surface-container-high)] p-4">{simulation ? 'El ensayo terminó.' : 'La sesión finalizó.'}</p>}
      <Card><CardContent className="min-h-72"><ScreenBody screen={screen} /><StudentActivity key={screen.id} state={state} send={send} pending={pending || Boolean(connectionError)} /></CardContent></Card>
    </ContentWindow>}
    {(error || connectionError || copyError) && <div role="alert" className="rounded-xl border border-[var(--color-error)] p-4"><p>{error || connectionError || copyError}</p>{!simulation && <Button variant="ghost" onClick={() => void refresh()}>Actualizar ahora</Button>}</div>}
    {teacher && active && <Card><CardContent className="flex flex-wrap items-center justify-between gap-5">
      <div><p className="text-sm text-[var(--color-text-muted)]">{simulation ? 'Código de prueba · sólo en este ensayo' : 'Código para ingresar'}</p><p className="font-mono text-3xl font-bold tracking-widest" data-testid="live-code">{session.code}</p>{link && <a className="mt-2 block break-all text-sm text-[var(--color-primary)]" href={link}>{link}</a>}</div>
      {!simulation && <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopyError('No se pudo copiar. Podés seleccionar el enlace que aparece junto al código.'); } }}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</Button>}
    </CardContent></Card>}
    {!active && <p role="status" className="rounded-xl bg-[var(--color-surface-container-high)] p-4">{simulation ? 'El ensayo terminó. Podés consultar las respuestas temporales o reiniciar la simulación.' : 'La sesión terminó. Las respuestas quedaron guardadas para consulta docente.'}</p>}
    <div className={teacher ? `grid items-start gap-6 ${compact ? '' : 'xl:grid-cols-[minmax(0,1fr)_22rem]'}` : ''}>
      <div className="min-w-0 space-y-5">
        {teacher && <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Pantalla {session.screenIndex + 1} de {teacher.material.screens.length}</p><Badge tone={session.activityOpen ? 'success' : 'neutral'}>{screen.type === 'content' ? 'Contenido' : session.activityOpen ? 'Respuestas abiertas' : 'Respuestas cerradas'}</Badge></div>}
        <Card><CardContent className="min-h-72"><ScreenBody screen={screen} />
          {teacher ? 'options' in screen && <ul className="mt-6 space-y-3">{screen.options.map((o) => <li key={o.id} className="rounded-xl border border-[var(--color-outline-variant)] p-4">{o.label}</li>)}</ul> : <StudentActivity key={screen.id} state={state} send={send} pending={pending || Boolean(connectionError)} />}
        </CardContent></Card>
        {teacher && <>
          {teacher.canControl ? <nav aria-label="Control de la sesión" className="space-y-4">
            <div className="flex flex-wrap justify-between gap-3"><Button variant="secondary" disabled={controlDisabled || session.screenIndex === 0} onClick={() => void send({ kind: 'screen', revision: session.revision, index: session.screenIndex - 1 })}>Anterior</Button><Button disabled={controlDisabled || session.screenIndex === teacher.material.screens.length - 1} onClick={() => void send({ kind: 'screen', revision: session.revision, index: session.screenIndex + 1 })}>Siguiente pantalla</Button></div>
            <div className="flex flex-wrap gap-3">{screen.type !== 'content' && <Button variant="secondary" disabled={controlDisabled} onClick={() => void send({ kind: 'activity', revision: session.revision, open: !session.activityOpen })}>{session.activityOpen ? 'Cerrar respuestas' : 'Abrir respuestas'}</Button>}{active && <Button variant="danger" disabled={controlDisabled} onClick={() => { if (window.confirm(simulation ? '¿Finalizar el ensayo? Podrás consultar las respuestas hasta reiniciarlo o salir.' : '¿Finalizar la sesión? Ya no se podrán enviar respuestas. El historial quedará guardado.')) void send({ kind: 'finish', revision: session.revision }); }}>{simulation ? 'Finalizar ensayo' : 'Finalizar sesión'}</Button>}</div>
          </nav> : <p className="text-sm text-[var(--color-text-muted)]">Esta sesión la conduce el docente que la inició. Podés consultar participantes y resultados.</p>}
          {teacherScreen && <TeacherScript screen={teacherScreen} index={session.screenIndex} total={teacher.material.screens.length} title={session.title} />}
          <Card><CardContent className="space-y-5">
            <h2 className="font-headline text-xl font-bold">Respuestas · sólo docentes</h2>
            <label className="block space-y-2"><span className="text-sm font-semibold">Consultar actividad</span><select value={results} onChange={(e) => setResults(e.target.value)} className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-3"><option value="">Seguir pantalla actual</option>{teacher.material.screens.filter((s) => s.type !== 'content').map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
            <p>{teacher.answers.length} de {teacher.participants.length} participantes respondieron{selected?.type === 'content' ? ' · esta pantalla no tiene actividad' : ''}.</p>
            {selected && 'options' in selected && <ul className="space-y-2">{selected.options.map((o) => <li key={o.id} className="flex justify-between gap-4 rounded-lg bg-[var(--color-surface-container-high)] p-3"><span>{o.label}</span><strong>{teacher.answers.filter((a) => a.answer === o.id).length}</strong></li>)}</ul>}
            {selected?.type === 'multiple-choice' && <p className="text-sm text-[var(--color-text-muted)]">Opción prevista: {selected.options.find((o) => o.id === selected.correctOptionId)?.label}. No se asignan notas.</p>}
            <ul className="max-h-96 space-y-3 overflow-auto">{teacher.answers.map((a) => <li key={a.id} className="border-t border-[var(--color-outline-variant)] pt-3"><p className="font-semibold">{teacher.participants.find((p) => p.student === a.student)?.name || 'Alumno'}</p><p className="mt-1 whitespace-pre-wrap break-words">{selected && 'options' in selected ? selected.options.find((o) => o.id === a.answer)?.label || a.answer : a.answer}</p></li>)}</ul>
          </CardContent></Card>
        </>}
      </div>
      {teacher && <Card><CardContent className="space-y-4"><h2 className="font-headline text-xl font-bold">Participantes ({teacher.participants.length})</h2><p className="text-sm text-[var(--color-text-muted)]">{active ? `${recent.length} con conexión reciente. ${simulation ? 'Participantes ficticios de este ensayo.' : 'Se actualiza cada 15 segundos; no equivale a asistencia.'}` : 'Registro de quienes ingresaron a la sesión.'}</p><ul className="max-h-[36rem] space-y-3 overflow-auto">{teacher.participants.map((p) => <li key={p.id} className="flex items-start justify-between gap-3 border-t border-[var(--color-outline-variant)] pt-3"><span className="break-words">{p.name}</span>{active && <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{recent.some((r) => r.id === p.id) ? 'Conectado' : 'Sin conexión reciente'}</span>}</li>)}</ul>{!teacher.participants.length && <p className="text-sm">{simulation ? 'Ingresá como alumno ficticio desde el panel de prueba.' : 'Compartí el enlace o el código para que ingresen tus alumnos.'}</p>}</CardContent></Card>}
    </div>
    {!simulation && <Link href={teacher ? '/docentes/interactivas' : '/estudiantes'} className="inline-block text-sm font-semibold text-[var(--color-primary)]">Volver al campus</Link>}
  </div>;
}
