import { beforeEach, expect, it, vi } from 'vitest';
import { fiaCourseId, getPendingFiaMakeup } from './fia-makeup';
import { createServiceClient } from './pocketbase-service';
import { getPendingDspMakeup } from './course-makeup-notice';

vi.mock('./pocketbase-service', () => ({ createServiceClient: vi.fn() }));
const exam = 'fiarec2nov24001';
const results = vi.fn();
const examList = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  results.mockResolvedValue([{ exam: 'fiafirstexam001', correct: 13, total: 20 }]);
  examList.mockResolvedValue([{ id: exam, studentRoster: { students: ['assigned'] } }, { id: 'fiasecondexam01' }]);
  vi.mocked(createServiceClient).mockResolvedValue({
    filter: (_: string, values: unknown) => JSON.stringify(values),
    collection: (name: string) => ({ getFullList: name === 'course_exams' ? examList : results }),
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

it('muestra las dos notas de Diseño sólo a una cuenta de la nómina de su recuperatorio', async () => {
  const course = '6taf9vkwwi8oxlz';
  examList.mockResolvedValue([
    { id: 'dsprec1nov27001', studentRoster: { students: ['assigned', 'another'] } },
    { id: 'dsprecabnov2701', studentRoster: { students: ['integral'] } },
  ]);
  results.mockResolvedValue([{ exam: 'dspfirstexam001', correct: 11, total: 20 }, { exam: 'dspsecondexam01', correct: 20, total: 20 }]);
  expect(await getPendingDspMakeup(course, 'unassigned')).toBeNull();
  expect(results).not.toHaveBeenCalled();
  const notice = await getPendingDspMakeup(course, 'assigned');
  expect(notice).toMatchObject({ examId: 'dsprec1nov27001', first: 5.5, second: 10 });
  expect(JSON.parse(results.mock.calls[0][0].filter)).toEqual({ course, student: 'assigned' });
  expect(JSON.stringify(notice)).not.toContain('another');
  results.mockResolvedValue([]);
  expect(await getPendingDspMakeup(course, 'integral')).toMatchObject({ examId: 'dsprecabnov2701', subject: 'ambos parciales' });
});
