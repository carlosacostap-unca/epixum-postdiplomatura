import { describe, expect, it } from 'vitest';
import example from '@/public/interactive-class-example.json';
import { parseInteractiveMaterial } from './interactive-material';
import { addSimulatedStudent, connectSimulatedStudent, createSimulation, joinSimulation, simulationCommand, simulationStudentState, simulationTeacherState, SIMULATION_CODE } from './interactive-simulation';
import type { InteractiveSimulation } from './interactive-simulation';

const material = parseInteractiveMaterial(example)!;
const fresh = () => createSimulation(material, 'Ensayo');
const move = (model: InteractiveSimulation, index: number) => simulationCommand(model, 'teacher', { kind: 'screen', index, revision: model.session.revision });
const open = (model: InteractiveSimulation, value = true) => simulationCommand(model, 'teacher', { kind: 'activity', open: value, revision: model.session.revision });
const answer = (model: InteractiveSimulation, studentId: string, value: string) => simulationCommand(model, { studentId }, { kind: 'answer', answer: value, screenId: model.session.screenId, revision: model.session.revision });
const join = (model: InteractiveSimulation, id = 'sim-1') => joinSimulation(model, id, SIMULATION_CODE);

describe('simulación privada de clases', () => {
  it('aísla respuestas por identidad y conserva solo la pantalla pública para alumnos', () => {
    let model = open(move(join(join(fresh()), 'sim-2'), 1));
    model = answer(model, 'sim-1', 'a');
    model = answer(model, 'sim-2', 'b');
    expect(simulationTeacherState(model)).toMatchObject({ participants: [{ student: 'sim-1' }, { student: 'sim-2' }], answers: [{ answer: 'a' }, { answer: 'b' }] });
    const student = simulationStudentState(model, 'sim-1');
    expect(student.ownAnswer?.answer).toBe('a');
    for (const key of ['material', 'answers', 'participants']) expect(student).not.toHaveProperty(key);
    expect(student.session.screen).not.toHaveProperty('correctOptionId');
    expect(student.session.screen).not.toHaveProperty('explanation');
    expect(answer(model, 'sim-1', 'a').answers).toHaveLength(2);
    expect(() => answer(model, 'sim-1', 'c')).toThrow('ya respondió');
  });
  it('rechaza ingresos inválidos, controles de alumno y respuestas cerradas u obsoletas', () => {
    let model = move(join(fresh()), 1);
    expect(() => joinSimulation(model, 'sim-2', 'OTRO0000')).toThrow('código');
    expect(() => answer(model, 'sim-1', 'a')).toThrow('abierta');
    expect(() => simulationCommand(model, { studentId: 'sim-1' }, { kind: 'finish', revision: model.session.revision })).toThrow('Sólo el docente');
    const staleRevision = model.session.revision;
    model = open(model);
    expect(() => simulationCommand(model, { studentId: 'sim-1' }, { kind: 'answer', answer: 'a', screenId: 'pregunta', revision: staleRevision })).toThrow('pantalla cambió');
    expect(() => answer(model, 'sim-2', 'a')).toThrow('conectado');
    expect(() => answer(model, 'sim-1', 'inexistente')).toThrow('opciones');
    expect(() => simulationCommand(model, 'teacher', { kind: 'answer', answer: 'a', screenId: 'pregunta', revision: model.session.revision })).toThrow('vista');
  });
  it('cierra envíos al cambiar de pantalla y recupera respuestas al reconectar', () => {
    let model = answer(open(move(join(fresh()), 1)), 'sim-1', 'a');
    model = connectSimulatedStudent(model, 'sim-1', false);
    expect(() => answer(model, 'sim-1', 'a')).toThrow('conectado');
    expect(simulationTeacherState(model).role).toBe('teacher');
    model = move(model, 2);
    expect(model.session.activityOpen).toBe(false);
    model = connectSimulatedStudent(model, 'sim-1', true);
    expect(simulationStudentState(model, 'sim-1').session.screenId).toBe('encuesta');
    model = move(model, 1);
    expect(simulationStudentState(model, 'sim-1').ownAnswer?.answer).toBe('a');
    expect(simulationTeacherState(model, 'pregunta')).toMatchObject({ answers: [{ answer: 'a' }] });
  });
  it('valida encuestas y textos, cierre final e ingreso tardío', () => {
    let model = open(move(join(fresh()), 2));
    model = answer(model, 'sim-1', 'ejemplos');
    model = open(move(model, 3));
    expect(() => answer(model, 'sim-1', 'x'.repeat(501))).toThrow('500');
    expect(() => answer(model, 'sim-1', '   ')).toThrow();
    model = answer(model, 'sim-1', '  Una pregunta  ');
    expect(model.answers[1].answer).toBe('Una pregunta');
    model = simulationCommand(model, 'teacher', { kind: 'finish', revision: model.session.revision });
    expect(model.session.activityOpen).toBe(false);
    expect(() => join(model, 'sim-2')).toThrow('terminó');
    expect(() => open(model)).toThrow('terminó');
    expect(() => answer(model, 'sim-1', 'Otra')).toThrow('terminó');
    expect(fresh().answers).toEqual([]);
    expect(fresh().students.every((s) => !s.joined)).toBe(true);
    expect(material).toEqual(parseInteractiveMaterial(example));
  });
  it('admite 100 identidades independientes sin duplicarlas al reingresar', () => {
    let model = fresh();
    while (model.students.length < 100) model = addSimulatedStudent(model);
    expect(() => addSimulatedStudent(model)).toThrow('100');
    for (const student of model.students) model = join(model, student.id);
    model = open(move(model, 1));
    for (const student of model.students) model = answer(model, student.id, 'a');
    model = join(model);
    expect(simulationTeacherState(model)).toMatchObject({ participants: expect.any(Array), answers: expect.any(Array) });
    expect(model.answers).toHaveLength(100);
    expect(model.students.filter((s) => s.joined)).toHaveLength(100);
  });
});
