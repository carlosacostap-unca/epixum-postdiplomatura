import { describe, expect, it } from 'vitest';
import { liveCommandSchema, projectionResults, publicScreen, safeInteractiveReturn, validateLiveAnswer } from './live-interactive-contract';
import { parseInteractiveMaterial } from './interactive-material';
import example from '@/public/interactive-class-example.json';
import { createSimulation, joinSimulation, simulationCommand, simulationStudentState, simulationTeacherState, SIMULATION_CODE } from './interactive-simulation';

describe('contrato de clases en vivo', () => {
  it('reserva el guion al docente en todos los tipos de pantalla y estados simulados', () => {
    const material = parseInteractiveMaterial({ ...example, screens: example.screens.map(s => ({ ...s, teacherNotes: 'GUION RESERVADO' })) })!;
    let model = joinSimulation(createSimulation(material, 'Ensayo'), 'sim-1', SIMULATION_CODE);
    for (let index = 0; index < material.screens.length; index++) {
      expect(publicScreen(material.screens[index])).not.toHaveProperty('teacherNotes');
      model = simulationCommand(model, 'teacher', { kind: 'screen', index, revision: model.session.revision });
      expect(JSON.stringify(simulationStudentState(model, 'sim-1'))).not.toContain('GUION RESERVADO');
      expect(JSON.stringify(simulationTeacherState(model))).toContain('GUION RESERVADO');
    }
  });
  const screen = { id: 'a', title: 'Pregunta', body: '', type: 'multiple-choice' as const, options: [{ id: 'yes', label: 'Sí' }, { id: 'no', label: 'No' }], correctOptionId: 'yes', explanation: 'Privada' };
  it('cuenta sólo opciones válidas de la pantalla actual y empieza en cero', () => {
    expect(projectionResults(screen, [])).toEqual({ screenId: 'a', total: 0, counts: { yes: 0, no: 0 } });
    expect(projectionResults(screen, [
      { screenId: 'a', answer: 'yes' }, { screenId: 'a', answer: 'no' },
      { screenId: 'a', answer: 'yes' }, { screenId: 'b', answer: 'yes' },
      { screenId: 'a', answer: 'invalid' },
    ])).toEqual({ screenId: 'a', total: 3, counts: { yes: 2, no: 1 } });
  });
  it('retira soluciones y campos desconocidos', () => {
    const published = publicScreen({ ...screen, secret: 'no publicar' } as typeof screen);
    expect(published).toEqual({ id: 'a', title: 'Pregunta', body: '', type: 'multiple-choice', options: screen.options });
    expect(published).not.toHaveProperty('explanation');
  });
  it('valida opciones y texto según la pantalla', () => {
    expect(validateLiveAnswer(publicScreen(screen), ' yes ')).toBe('yes');
    expect(() => validateLiveAnswer(publicScreen(screen), 'otro')).toThrow();
    const short = { id: 'b', title: 'Texto', body: '', type: 'short-answer' as const, maxLength: 3 };
    expect(() => validateLiveAnswer(short, 'abcd')).toThrow();
    expect(() => validateLiveAnswer(short, '   ')).toThrow();
    expect(() => validateLiveAnswer({ ...short, type: 'content' }, 'a')).toThrow();
  });
  it('exige revisiones y rechaza comandos extra', () => {
    expect(liveCommandSchema.safeParse({ kind: 'finish' }).success).toBe(false);
    expect(liveCommandSchema.safeParse({ kind: 'screen', revision: 'a'.repeat(24), index: 80 }).success).toBe(false);
    expect(liveCommandSchema.safeParse({ kind: 'heartbeat', student: 'otro' }).success).toBe(false);
  });
  it.each(['https://other.test', '//other.test', '/\\other.test', '/interactivas?codigo=A1B2C3D4&next=https://other.test', '/interactivas/%2f%2fother', '/admin', '/interactivas\n'])('rechaza retorno %s', (value) => expect(safeInteractiveReturn(value)).toBeNull());
  it.each(['/interactivas', '/interactivas?codigo=A1B2C3D4', '/interactivas/sesion/123456789abcdef'])('permite retorno %s', (value) => expect(safeInteractiveReturn(value)).toBe(value));
});
