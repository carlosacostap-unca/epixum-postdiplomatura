'use client';

import { useRef, useState } from 'react';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import type { InteractiveMaterial } from '@/lib/interactive-material';
import type { LiveCommand } from '@/lib/live-interactive-contract';
import {
  addSimulatedStudent, connectSimulatedStudent, createSimulation, joinSimulation,
  MAX_SIMULATED_STUDENTS, simulationCommand, simulationStudentState, simulationTeacherState,
  type InteractiveSimulation,
} from '@/lib/interactive-simulation';
import { LiveRoomView } from './LiveRoomView';

interface SimulationRoomProps { material: InteractiveMaterial; title: string }

export function SimulationRoom(props: SimulationRoomProps) {
  const [attempt, setAttempt] = useState(0);
  return <SimulationAttempt key={attempt} {...props} restart={() => {
    if (window.confirm('¿Reiniciar la simulación? Se borrarán los alumnos y las respuestas de este ensayo.')) setAttempt((value) => value + 1);
  }} />;
}

function SimulationAttempt({ material, title, restart }: SimulationRoomProps & { restart: () => void }) {
  const [model, setModel] = useState(() => createSimulation(material, title));
  const current = useRef(model);
  const [selectedStudent, setSelectedStudent] = useState('sim-1');
  const [results, setResults] = useState('');
  const [view, setView] = useState<'both' | 'teacher' | 'student'>('both');
  const [error, setError] = useState('');
  const student = model.students.find((s) => s.id === selectedStudent)!;

  function update(change: (value: InteractiveSimulation) => InteractiveSimulation) {
    try {
      const next = change(current.current);
      current.current = next;
      setModel(next); setError('');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la prueba.');
      return false;
    }
  }

  async function sendTeacher(command: LiveCommand) {
    return update((value) => simulationCommand(value, 'teacher', command));
  }
  async function sendStudent(command: LiveCommand) {
    return update((value) => simulationCommand(value, { studentId: selectedStudent }, command));
  }

  return <div className="space-y-6">
    <Card><CardContent className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone="warning">Modo simulación · sólo docentes</Badge>
        <Button variant="secondary" onClick={restart}>Reiniciar simulación</Button>
      </div>
      <p>Probá la clase como docente y como distintos alumnos ficticios. Las respuestas de prueba se descartan al salir o recargar esta página.</p>
      <p className="text-sm text-[var(--color-text-muted)]">El código funciona dentro de este ensayo. Para invitar alumnos reales, volvé a la preparación e iniciá una sesión en vivo.</p>
      <div role="group" aria-label="Vistas de la simulación" className="flex flex-wrap gap-2">
        {([['both', 'Ambas vistas'], ['teacher', 'Sólo docente'], ['student', 'Sólo alumno']] as const).map(([value, label]) =>
          <Button key={value} variant={view === value ? 'primary' : 'secondary'} aria-pressed={view === value} onClick={() => setView(value)}>{label}</Button>)}
      </div>
    </CardContent></Card>
    {error && <p role="alert" className="rounded-xl border border-[var(--color-error)] p-4">{error}</p>}
    <div className={view === 'both' ? 'grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}>
      {view !== 'student' && <section aria-label="Vista docente" className="min-w-0 space-y-5">
        <h2 className="font-headline text-2xl font-bold">Como docente</h2>
        <LiveRoomView state={simulationTeacherState(model, results)} results={results} setResults={setResults} send={sendTeacher} simulation compact={view === 'both'} />
      </section>}
      {view !== 'teacher' && <section aria-label="Vista del alumno" className="min-w-0 space-y-5">
        <h2 className="font-headline text-2xl font-bold">Como alumno</h2>
        <Card><CardContent className="space-y-4">
          <label className="block space-y-2"><span className="font-semibold">Alumno de prueba</span>
            <select value={selectedStudent} onChange={(event) => { setSelectedStudent(event.target.value); setError(''); }} className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-3">
              {model.students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.connected ? ' · conectado' : s.joined ? ' · desconectado' : ' · sin ingresar'}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={model.students.length >= MAX_SIMULATED_STUDENTS || model.session.status === 'closed'} onClick={() => {
              const id = `sim-${current.current.students.length + 1}`;
              if (update(addSimulatedStudent)) setSelectedStudent(id);
            }}>Agregar alumno ficticio</Button>
            {student.joined && <Button variant="secondary" onClick={() => update((value) => connectSimulatedStudent(value, student.id, !student.connected))}>{student.connected ? 'Desconectar alumno' : 'Reconectar alumno'}</Button>}
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Cada alumno tiene sus propias respuestas. Cambiar de alumno mantiene conectados a los demás.</p>
        </CardContent></Card>
        {!student.joined ? <SimulatedEntry key={student.id} closed={model.session.status === 'closed'} join={(code) => update((value) => joinSimulation(value, student.id, code))} />
          : !student.connected ? <Card><CardContent><p role="status">Este alumno está desconectado. Al reconectarlo verá la pantalla actual y sus respuestas guardadas en el ensayo.</p></CardContent></Card>
            : <LiveRoomView key={student.id} state={simulationStudentState(model, student.id)} results="" setResults={() => {}} send={sendStudent} simulation />}
      </section>}
    </div>
  </div>;
}

function SimulatedEntry({ closed, join }: { closed: boolean; join: (code: string) => boolean }) {
  const [code, setCode] = useState('');
  return <Card><CardContent><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); join(code); }}>
    <h3 className="text-xl font-bold">Ingresar al ensayo</h3>
    <label className="block space-y-2"><span className="font-semibold">Código de prueba</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required minLength={8} maxLength={8} pattern="[A-Za-z0-9]{8}" autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="Código del panel docente" disabled={closed} className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-3 font-mono" /></label>
    <Button type="submit" disabled={closed || code.trim().length !== 8}>Entrar como alumno</Button>
    {closed && <p>El ensayo terminó. Reiniciá la simulación para volver a ingresar.</p>}
  </form></CardContent></Card>;
}
