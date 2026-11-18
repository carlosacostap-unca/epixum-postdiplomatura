import { beforeEach, expect, it, vi } from 'vitest';
import { fiaCourseId, getPendingFiaMakeup } from './fia-makeup';
import { createServiceClient } from './pocketbase-service';

vi.mock('./pocketbase-service', () => ({ createServiceClient: vi.fn() }));
const exam = 'fiarec2nov24001';
const results = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  results.mockResolvedValue([{ exam: 'fiafirstexam001', correct: 13, total: 20 }]);
  const exams = [{ id: exam, studentRoster: { students: ['assigned'] } }, { id: 'fiasecondexam01' }];
  vi.mocked(createServiceClient).mockResolvedValue({
    filter: (_: string, values: unknown) => JSON.stringify(values),
    collection: (name: string) => ({ getFullList: name === 'course_exams' ? async () => exams : results }),
  } as unknown as Awaited<ReturnType<typeof createServiceClient>>);
});
it('muestra la nota propia y distingue un ausente del cero', async () => {
  expect(await getPendingFiaMakeup(fiaCourseId, 'assigned')).toMatchObject({ first: 6.5, second: null, examId: exam });
  expect(results.mock.calls[0][0].filter).toContain('"student":"assigned"');
  results.mockResolvedValue([{ exam: 'fiafirstexam001', correct: 0, total: 20 }]);
  expect((await getPendingFiaMakeup(fiaCourseId, 'assigned'))?.first).toBe(0);
});
it('omite a quienes no tienen asignación y a otros cursos', async () => {
  expect(await getPendingFiaMakeup('other', 'assigned')).toBeNull();
  expect(createServiceClient).not.toHaveBeenCalled();
  expect(await getPendingFiaMakeup(fiaCourseId, 'other')).toBeNull();
  expect(results).not.toHaveBeenCalled();
});
it('retira el aviso cuando consta la entrega del recuperatorio asignado', async () => {
  results.mockResolvedValue([{ exam, correct: 15, total: 20 }]);
  expect(await getPendingFiaMakeup(fiaCourseId, 'assigned')).toBeNull();
});
