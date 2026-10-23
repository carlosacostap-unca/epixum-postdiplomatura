import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CourseExamRunner } from './CourseExamRunner';
import type { ExamView } from '@/lib/course-exams';
const mocks = vi.hoisted(() => ({ save: vi.fn(), send: vi.fn(), read: vi.fn(), report: vi.fn(), camera: { ready: true, opening: false, error: '', activate: vi.fn(), check: vi.fn(), isLive: vi.fn(() => true), videoRef: { current: null } } }));
vi.mock('@/lib/actions-course-exams', () => ({ saveExamAnswer: mocks.save, sendExam: mocks.send, readExam: mocks.read, examCamera: mocks.report }));
vi.mock('@/components/preparation/useWebcam', () => ({ useWebcam: () => mocks.camera }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const initial: ExamView = { id: 'attempt', examId: 'exam', title: 'Parcial', description: '', selected: {}, deadline: '2026-10-23T13:00:00Z', serverNow: Date.parse('2026-10-23T12:30:00Z'), result: null, questions: [1, 2].map(i => ({ id: `q${i}`, prompt: `Enunciado ${i}`, options: [{ id: 'a', label: `Opción A${i}` }, { id: 'b', label: `Opción B${i}` }] })) };
beforeEach(() => { vi.clearAllMocks(); mocks.camera.ready = true; mocks.camera.isLive.mockReturnValue(true); mocks.report.mockResolvedValue({ success: true, data: true }); });
afterEach(() => { vi.useRealTimers(); });
const receipt = { id: 'result', attempt: 'attempt', finishedAt: '2026-10-23T12:40:00Z', reason: 'submitted' as const, feedbackAvailable: false as const, selected: { q1: 'a' } };
const feedback = { ...receipt, feedbackAvailable: true as const, correct: 1, total: 3, percentage: 33, review: [1, 2, 3].map(i => ({ question: { id: `q${i}`, prompt: `Enunciado ${i}`, options: [{ id: 'a', label: `Opción A${i}` }, { id: 'b', label: `Opción B${i}` }], correctOptionId: 'b', explanation: `Explicación completa ${i}` }, selectedOptionId: i === 1 ? 'b' : i === 2 ? 'a' : null, correct: i === 1 })) };
it('permite saltar a cualquier pregunta sin responder la actual', async () => {
  const user = userEvent.setup(); render(<CourseExamRunner courseId="course" initial={initial} />);
  await user.click(screen.getByRole('button', { name: 'Pregunta 2, sin responder' }));
  expect(screen.getByText('Enunciado 2')).toBeVisible();
  expect(mocks.save).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Pregunta anterior' }));
  expect(screen.getByText('Enunciado 1')).toBeVisible();
});
it('muestra una pregunta por vez y guarda al tildar, sin confirmación adicional', async () => {
  mocks.save.mockResolvedValue({ success: true, data: { ...initial, selected: { q1: 'b' } } });
  const user = userEvent.setup(); render(<CourseExamRunner courseId="course" initial={initial} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción B1' })).toBeEnabled());
  expect(screen.queryByText('Enunciado 2')).not.toBeInTheDocument();
  await user.click(screen.getByRole('radio', { name: 'Opción B1' }));
  expect(mocks.save).toHaveBeenCalledWith('course', 'attempt', expect.objectContaining({ questionId: 'q1', optionId: 'b', mutationId: expect.any(String) }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción B1' })).toBeChecked());
  expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Siguiente pregunta' }));
  expect(screen.getByText('Enunciado 2')).toBeVisible();
  expect(screen.queryByText('Enunciado 1')).not.toBeInTheDocument();
});
it('reanuda opciones guardadas y permite modificarlas', async () => {
  mocks.save.mockResolvedValue({ success: true, data: { ...initial, selected: { q1: 'a' } } });
  const user = userEvent.setup(); render(<CourseExamRunner courseId="course" initial={{ ...initial, selected: { q1: 'b' } }} />);
  expect(screen.getByRole('radio', { name: 'Opción B1' })).toBeChecked();
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeEnabled());
  await user.click(screen.getByRole('radio', { name: 'Opción A1' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeChecked());
  expect(screen.getByRole('timer')).toHaveTextContent('30:00');
});
it('si falla el guardado conserva la selección, bloquea la entrega y reintenta la misma operación', async () => {
  mocks.save.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ success: true, data: { ...initial, selected: { q1: 'a' } } });
  const user = userEvent.setup(); render(<CourseExamRunner courseId="course" initial={initial} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeEnabled());
  await user.click(screen.getByRole('radio', { name: 'Opción A1' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó');
  expect(screen.getByRole('button', { name: 'Entregar parcial' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Siguiente pregunta' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Reintentar guardado' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Reintentar guardado' })).not.toBeInTheDocument());
  expect(mocks.save.mock.calls[0]).toEqual(mocks.save.mock.calls[1]);
});
it('bloquea las respuestas al perder la cámara sin pausar el plazo', async () => {
  const view = render(<CourseExamRunner courseId="course" initial={initial} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeEnabled());
  mocks.camera.ready = false; mocks.camera.isLive.mockReturnValue(false);
  view.rerender(<CourseExamRunner courseId="course" initial={initial} />);
  expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeDisabled();
  expect(screen.getByRole('timer')).toHaveTextContent('30:00');
});
it('recupera la entrega automática al vencer el plazo y muestra la nota', async () => {
  mocks.read.mockResolvedValue({ success: true, data: { ...initial, result: { ...feedback, reason: 'expired', total: 2, percentage: 50, review: feedback.review.slice(0, 2) } } });
  render(<CourseExamRunner courseId="course" initial={{ ...initial, serverNow: Date.parse(initial.deadline) }} />);
  expect(await screen.findByText('Parcial entregado')).toBeVisible();
  expect(screen.getByText('Entrega automática por cierre del horario.')).toBeVisible();
  expect(screen.getByText(/Nota: 5 \/ 10/)).toBeVisible();
});
it('confirma la entrega anticipada sin mostrar nota, claves ni explicaciones', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  mocks.send.mockResolvedValue({ success: true, data: receipt });
  const user = userEvent.setup(); render(<CourseExamRunner courseId="course" initial={initial} />);
  await user.click(screen.getByRole('button', { name: 'Entregar parcial' }));
  expect(await screen.findByText('Parcial entregado')).toBeVisible();
  expect(screen.getByText(/La nota y la devolución completa estarán disponibles a partir del cierre/)).toBeVisible();
  expect(screen.queryByText(/Nota:/)).not.toBeInTheDocument();
  expect(screen.queryByText('Respuesta correcta')).not.toBeInTheDocument();
  expect(mocks.read).not.toHaveBeenCalled();
});
it('libera automáticamente la devolución al cierre aunque ya se hubiese entregado', async () => {
  vi.useFakeTimers();
  mocks.read.mockResolvedValue({ success: true, data: { ...initial, result: feedback } });
  render(<CourseExamRunner courseId="course" initial={{ ...initial, serverNow: Date.parse(initial.deadline) - 1000, result: receipt }} />);
  expect(screen.queryByRole('region', { name: 'Resultado y devolución completa' })).not.toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
  expect(screen.getByRole('region', { name: 'Resultado y devolución completa' })).toBeVisible();
  expect(mocks.read).toHaveBeenCalledWith('course', 'attempt');
});
it('muestra todas las opciones, correcciones y explicaciones, incluidas las omitidas', () => {
  render(<CourseExamRunner courseId="course" initial={{ ...initial, result: feedback }} />);
  expect(screen.getByText('1 correctas · 1 incorrectas · 1 sin responder')).toBeVisible();
  for (const i of [1, 2, 3]) {
    expect(screen.getByText(`Enunciado ${i}`)).toBeVisible();
    expect(screen.getByText(`Opción A${i}`)).toBeVisible();
    expect(screen.getByText(`Opción B${i}`)).toBeVisible();
    expect(screen.getByText(`Explicación completa ${i}`)).toBeVisible();
  }
  expect(screen.getAllByText('Respuesta correcta')).toHaveLength(3);
  expect(screen.getAllByText('Tu respuesta')).toHaveLength(2);
  expect(screen.getByText('No seleccionaste una opción. Esta pregunta suma cero puntos.')).toBeVisible();
});
