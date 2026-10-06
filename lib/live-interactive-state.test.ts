// @vitest-environment node
import { expect, it, vi } from 'vitest';
import type PocketBase from 'pocketbase';
import example from '@/public/interactive-class-example.json';
import { readLiveState } from './live-interactive';
import { publicScreen } from './live-interactive-contract';
import { parseInteractiveMaterial } from './interactive-material';

it('consulta la pregunta actual junto al historial y separa los resultados proyectados', async () => {
  const material = parseInteractiveMaterial(example)!;
  const current = publicScreen(material.screens[2]);
  const session = { id: 'session', course: 'course', controller: 'teacher', screenId: current.id, screen: current };
  const records = [
    { id: 'old', student: 'one', screenId: 'pregunta', answer: 'a' },
    { id: 'new1', student: 'one', screenId: current.id, answer: 'ejemplos' },
    { id: 'new2', student: 'two', screenId: current.id, answer: 'practica' },
  ];
  const responses = vi.fn(async () => records);
  const pb = {
    authStore: { isValid: true, record: { id: 'teacher' } },
    filter: (expression: string, params: object) => JSON.stringify({ expression, params }),
    collection: (name: string) => ({
      getOne: async () => name === 'courses' ? { interactiveClassesEnabled: true, teachers: ['teacher'] } : session,
      getFirstListItem: async () => ({ material }),
      getFullList: name === 'interactive_responses' ? responses : async () => [],
    }),
  } as unknown as PocketBase;
  const state = await readLiveState(pb, 'session', 'pregunta');
  expect(responses).toHaveBeenCalledWith(expect.objectContaining({ filter: JSON.stringify({
    expression: 'session = {:session} && (screenId = {:screen} || screenId = {:current})',
    params: { session: 'session', screen: 'pregunta', current: 'encuesta' },
  }) }));
  expect(state).toMatchObject({
    answers: [expect.objectContaining({ id: 'old' })],
    projectionResults: { screenId: 'encuesta', total: 2, counts: { ejemplos: 1, practica: 1, grupo: 0 } },
  });
  if (state.role !== 'teacher') throw new Error('Expected teacher');
  expect(JSON.stringify(state.projectionResults)).not.toContain('student');
  pb.authStore.record!.id = 'student';
  expect(await readLiveState(pb, 'session')).not.toHaveProperty('projectionResults');
});
