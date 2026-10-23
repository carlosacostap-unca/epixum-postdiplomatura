import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { CourseExamStart } from './CourseExamRunner';
const mocks = vi.hoisted(() => ({ start: vi.fn(), push: vi.fn(), capture: vi.fn(), ready: true, live: vi.fn(() => true) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/actions-course-exams', () => ({ beginExam: mocks.start }));
vi.mock('@/components/preparation/useWebcam', () => ({ useWebcam: () => ({ ready: mocks.ready, isLive: mocks.live, capture: mocks.capture, videoRef: { current: null }, check: () => {}, activate: () => {}, opening: false, error: '' }) }));
const exam = { id: 'exam', title: 'Parcial', description: '', status: 'published' as const, opensAt: '2026-10-23T12:00:00Z', closesAt: '2026-10-23T13:00:00Z' };
beforeEach(() => { vi.clearAllMocks(); mocks.ready = true; mocks.live.mockReturnValue(true); mocks.capture.mockResolvedValue(new Blob(['synthetic-test-photo'], { type: 'image/jpeg' })); });
it('exige aviso y cámara, captura una vez y reintenta con la misma foto', async () => {
  const user = userEvent.setup(); mocks.start.mockResolvedValueOnce({ success: false, error: 'Error temporal' }).mockResolvedValueOnce({ success: true, data: 'attempt' });
  render(<CourseExamStart courseId="course" exam={exam} />);
  expect(screen.getByRole('button', { name: 'Tomar foto e iniciar parcial' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox')); await user.click(screen.getByRole('button', { name: 'Tomar foto e iniciar parcial' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Error temporal');
  await user.click(screen.getByRole('button', { name: 'Tomar foto e iniciar parcial' }));
  expect(mocks.capture).toHaveBeenCalledOnce(); expect(mocks.start).toHaveBeenCalledTimes(2);
  const form = mocks.start.mock.calls[0][3] as FormData; expect(form.get('accepted')).toBe('true'); expect(form.get('photo')).toBeTruthy();
  expect(mocks.push).toHaveBeenCalledWith('/estudiantes/cursos/course/parciales/intentos/attempt');
});
it('no captura ni comienza con la cámara apagada', async () => {
  mocks.ready = false; mocks.live.mockReturnValue(false);
  render(<CourseExamStart courseId="course" exam={exam} />);
  await userEvent.setup().click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button', { name: 'Tomar foto e iniciar parcial' })).toBeDisabled(); expect(mocks.capture).not.toHaveBeenCalled();
});
