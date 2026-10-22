import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ExamRunner } from './ExamRunner';

const mocks = vi.hoisted(() => ({ answer: vi.fn(), finish: vi.fn(), report: vi.fn(), camera: { ready: true, opening: false, error: '', activate: vi.fn(), check: vi.fn(), isLive: vi.fn(() => true), videoRef: { current: null } } }));
vi.mock('@/lib/actions-preparation', () => ({ submitPracticeAnswer: mocks.answer, submitPractice: mocks.finish }));
vi.mock('@/lib/actions-exam-camera', () => ({ reportExamCamera: mocks.report }));
vi.mock('./useWebcam', () => ({ useWebcam: () => mocks.camera }));
const questions = [1, 2].map(n => ({ id: `q${n}`, prompt: `Pregunta ${n}`, options: [{ id: 'a', label: `Opción A${n}` }, { id: 'b', label: `Opción B${n}` }] }));
const props = { courseId: 'course', quizId: 'quiz', attemptId: 'attempt', questions, initialSelected: {}, initialResult: null, serverNow: Date.parse('2026-10-14T12:00:30Z'), deadline: '2026-10-14T12:01:00Z' };
const result = { id: 'result', attempt: 'attempt', course: 'course', student: 'student', title: 'Examen', correct: 0, total: 2, percentage: 0, review: [], created: '' };
beforeEach(() => { vi.clearAllMocks(); mocks.camera.ready = true; mocks.camera.isLive.mockReturnValue(true); mocks.report.mockResolvedValue({ success: true, active: true }); });

it('reanuda el tiempo restante y las respuestas confirmadas sin mostrar soluciones', () => {
  render(<ExamRunner {...props} initialSelected={{ q1: 'b' }} />);
  expect(screen.getByRole('timer')).toHaveTextContent('0:30');
  expect(screen.getByRole('radio', { name: 'Opción B1' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Opción B1' })).toBeDisabled();
  expect(screen.queryByText('Respuesta correcta')).not.toBeInTheDocument();
});

it('mantiene el reloj original si el servidor revalida la página al guardar', () => {
  const view = render(<ExamRunner {...props} />);
  view.rerender(<ExamRunner {...props} serverNow={props.serverNow + 10000} />);
  expect(screen.getByRole('timer')).toHaveTextContent('0:30');
});

it('permite saltar preguntas y guarda una respuesta sin revelar corrección', async () => {
  mocks.answer.mockResolvedValue({ success: true, attempt: { selected: { q2: 'a' }, result: null } });
  const user = userEvent.setup(); render(<ExamRunner {...props} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción A1' })).not.toBeDisabled());
  await user.click(screen.getByRole('button', { name: 'Pregunta 2, sin responder' }));
  await user.click(screen.getByRole('radio', { name: 'Opción A2' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar respuesta' }));
  expect(mocks.answer).toHaveBeenCalledWith('course', 'attempt', 'q2', 'a');
  expect(await screen.findByText('Respuesta guardada. La corrección estará disponible al finalizar.')).toBeVisible();
  expect(screen.queryByText('Respuesta correcta')).not.toBeInTheDocument();
});

it('bloquea respuestas cuando se apaga la cámara y permite recuperarlas al reactivarla', async () => {
  const view = render(<ExamRunner {...props} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción A1' })).not.toBeDisabled());
  mocks.camera.ready = false; mocks.camera.isLive.mockReturnValue(false);
  view.rerender(<ExamRunner {...props} />);
  expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeDisabled();
  expect(screen.getByRole('timer')).toHaveTextContent('0:30');
  mocks.camera.ready = true; mocks.camera.isLive.mockReturnValue(true);
  view.rerender(<ExamRunner {...props} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Opción A1' })).not.toBeDisabled());
});

it('cierra automáticamente un intento agotado y muestra la nota', async () => {
  mocks.finish.mockResolvedValue({ success: true, result });
  render(<ExamRunner {...props} serverNow={Date.parse(props.deadline) + 1} />);
  await waitFor(() => expect(mocks.finish).toHaveBeenCalledWith('course', 'attempt'));
  expect(await screen.findByText('Nota simulada: 0 / 10')).toBeVisible();
});

it('permite entregar anticipadamente con preguntas omitidas', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  mocks.finish.mockResolvedValue({ success: true, result });
  const user = userEvent.setup(); render(<ExamRunner {...props} />);
  await user.click(screen.getByRole('button', { name: 'Entregar examen' }));
  expect(await screen.findByText('Nota simulada: 0 / 10')).toBeVisible();
});
