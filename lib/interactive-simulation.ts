import type { InteractiveMaterial } from './interactive-material';
import { joinSessionSchema, liveCommandSchema, publicScreen, validateLiveAnswer } from './live-interactive-contract';
import type { LiveAnswer, LiveCommand, LiveSession, LiveState } from './live-interactive-contract';

export const SIMULATION_CODE = 'PRUEBA01';
export const MAX_SIMULATED_STUDENTS = 100;
export interface SimulatedStudent { id: string; name: string; joined: boolean; connected: boolean }
export interface InteractiveSimulation {
  material: InteractiveMaterial;
  session: LiveSession;
  students: SimulatedStudent[];
  answers: LiveAnswer[];
  sequence: number;
}

export function createSimulation(material: InteractiveMaterial, title: string): InteractiveSimulation {
  const screen = material.screens[0];
  if (!screen) throw new Error('La simulación necesita material válido.');
  return {
    material, sequence: 0, answers: [],
    students: [1, 2, 3].map((n) => ({ id: `sim-${n}`, name: `Alumno de prueba ${n}`, joined: false, connected: false })),
    session: {
      id: 'simulation', course: '', class: '', lesson: '', controller: 'simulation-teacher',
      title, classTitle: 'Ensayo privado · participantes ficticios', code: SIMULATION_CODE,
      status: 'live', screenIndex: 0, screenId: screen.id, screenType: screen.type, screen: publicScreen(screen),
      activityOpen: false, revision: '0'.repeat(24), created: '', updated: '', closedAt: '',
    },
  };
}

function studentById(model: InteractiveSimulation, id: string) {
  const student = model.students.find((s) => s.id === id);
  if (!student) throw new Error('Elegí un alumno de prueba.');
  return student;
}

export function addSimulatedStudent(model: InteractiveSimulation): InteractiveSimulation {
  if (model.students.length >= MAX_SIMULATED_STUDENTS) throw new Error('El ensayo admite hasta 100 alumnos ficticios.');
  const n = model.students.length + 1;
  return { ...model, students: [...model.students, { id: `sim-${n}`, name: `Alumno de prueba ${n}`, joined: false, connected: false }] };
}

export function joinSimulation(model: InteractiveSimulation, studentId: string, code: string): InteractiveSimulation {
  studentById(model, studentId);
  const parsed = joinSessionSchema.safeParse({ code });
  if (!parsed.success || parsed.data.code !== model.session.code) throw new Error('El código de prueba no coincide. Copialo del panel docente.');
  if (model.session.status !== 'live') throw new Error('El ensayo terminó. Reinicialo para probar otro ingreso.');
  return { ...model, students: model.students.map((s) => s.id === studentId ? { ...s, joined: true, connected: true } : s) };
}

export function connectSimulatedStudent(model: InteractiveSimulation, studentId: string, connected: boolean): InteractiveSimulation {
  if (!studentById(model, studentId).joined) throw new Error('Primero ingresá con el código de prueba.');
  return { ...model, students: model.students.map((s) => s.id === studentId ? { ...s, connected } : s) };
}

// No database, cookies, storage or network: the whole rehearsal belongs to this page.
export function simulationCommand(model: InteractiveSimulation, actor: 'teacher' | { studentId: string }, input: LiveCommand, now = Date.now()): InteractiveSimulation {
  const command = liveCommandSchema.parse(input);
  const session = model.session;
  if (actor !== 'teacher') {
    const student = studentById(model, actor.studentId);
    if (!student.joined || !student.connected) throw new Error('El alumno debe estar conectado al ensayo.');
    if (command.kind === 'heartbeat') return model;
    if (command.kind !== 'answer') throw new Error('Sólo el docente puede controlar el ensayo.');
  } else if (command.kind === 'answer' || command.kind === 'heartbeat') {
    throw new Error('Respondé desde la vista de un alumno de prueba.');
  }
  if (session.status !== 'live') throw new Error('El ensayo ya terminó.');
  if ('revision' in command && command.revision !== session.revision) throw new Error('La pantalla cambió. Volvé a intentar.');
  if (command.kind === 'answer' && actor !== 'teacher') {
    if (!session.activityOpen || command.screenId !== session.screenId) throw new Error('La actividad no está abierta en esta pantalla.');
    const answer = validateLiveAnswer(session.screen, command.answer);
    const existing = model.answers.find((a) => a.student === actor.studentId && a.screenId === session.screenId);
    if (existing) {
      if (existing.answer === answer) return model;
      throw new Error('Este alumno ya respondió la actividad.');
    }
    return { ...model, answers: [...model.answers, { id: `sim-answer-${model.answers.length + 1}`, student: actor.studentId, screenId: session.screenId, answer, created: new Date(now).toISOString() }] };
  }
  const sequence = model.sequence + 1;
  const next = { ...session, revision: sequence.toString(16).padStart(24, '0'), updated: new Date(now).toISOString() };
  if (command.kind === 'screen') {
    const screen = model.material.screens[command.index];
    if (!screen) throw new Error('La pantalla no existe.');
    Object.assign(next, { screenIndex: command.index, screenId: screen.id, screenType: screen.type, screen: publicScreen(screen), activityOpen: false });
  } else if (command.kind === 'activity') {
    if (session.screen.type === 'content') throw new Error('Esta pantalla no tiene una actividad.');
    next.activityOpen = command.open;
  } else if (command.kind === 'finish') {
    next.status = 'closed'; next.activityOpen = false; next.closedAt = new Date(now).toISOString();
  }
  return { ...model, session: next, sequence };
}

export function simulationTeacherState(model: InteractiveSimulation, results = '', now = Date.now()): LiveState {
  const resultsScreenId = results || model.session.screenId;
  return {
    role: 'teacher', canControl: true, material: model.material, session: model.session,
    serverTime: now, ownAnswer: null, resultsScreenId,
    participants: model.students.filter((s) => s.joined).map((s) => ({ id: s.id, student: s.id, name: s.name, updated: new Date(s.connected ? now : 0).toISOString() })),
    answers: model.answers.filter((a) => a.screenId === resultsScreenId),
  };
}

export function simulationStudentState(model: InteractiveSimulation, studentId: string, now = Date.now()): LiveState {
  const student = studentById(model, studentId);
  if (!student.joined || !student.connected) throw new Error('El alumno no está conectado.');
  return {
    role: 'student', session: model.session, serverTime: now,
    ownAnswer: model.answers.find((a) => a.student === studentId && a.screenId === model.session.screenId) ?? null,
  };
}
