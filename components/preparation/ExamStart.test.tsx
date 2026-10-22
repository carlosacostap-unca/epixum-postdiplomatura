import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ExamStart } from './ExamStart';

const mocks = vi.hoisted(() => ({ start: vi.fn(), push: vi.fn(), capture: vi.fn(), live: vi.fn(() => true), ready: true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/actions-exam-camera', () => ({ beginExamWithPhoto: mocks.start }));
vi.mock('./useWebcam', () => ({ useWebcam: () => ({ ready: mocks.ready, isLive: mocks.live, capture: mocks.capture, videoRef: { current: null }, check: () => {}, activate: () => {}, opening: false, error: '' }) }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.ready = true; mocks.live.mockReturnValue(true);
  mocks.capture.mockResolvedValue(new Blob(['synthetic-test-photo'], { type: 'image/jpeg' }));
});

it('exige cámara y aviso aceptado antes de capturar una única foto', async () => {
  const user = userEvent.setup(); mocks.start.mockResolvedValue({ success: true, id: 'attempt' });
  render(<ExamStart courseId="course" quizId="quiz" durationMinutes={60} questionCount={10} />);
  expect(screen.getByRole('button', { name: 'Tomar foto e iniciar examen' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Tomar foto e iniciar examen' }));
  expect(mocks.capture).toHaveBeenCalledOnce();
  expect(mocks.push).toHaveBeenCalledWith('/estudiantes/cursos/course/preparacion/intentos/attempt');
  expect(mocks.start).toHaveBeenCalledWith('course', 'quiz', expect.any(FormData));
});

it('reintenta el guardado usando la misma foto sin hacer otra captura', async () => {
  const user = userEvent.setup(); mocks.start.mockResolvedValueOnce({ success: false, error: 'No se pudo guardar.' }).mockResolvedValueOnce({ success: true, id: 'attempt' });
  render(<ExamStart courseId="course" quizId="quiz" durationMinutes={60} questionCount={10} />);
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Tomar foto e iniciar examen' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar.');
  await user.click(screen.getByRole('button', { name: 'Tomar foto e iniciar examen' }));
  expect(mocks.capture).toHaveBeenCalledOnce(); expect(mocks.start).toHaveBeenCalledTimes(2);
});

it('impide iniciar si la cámara está apagada', async () => {
  mocks.ready = false; mocks.live.mockReturnValue(false);
  const user = userEvent.setup(); render(<ExamStart courseId="course" quizId="quiz" durationMinutes={60} questionCount={10} />);
  await user.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button', { name: 'Tomar foto e iniciar examen' })).toBeDisabled();
  expect(mocks.capture).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
});
