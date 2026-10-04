import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { PracticeRunner } from './PracticeRunner';
import { publicPracticeQuestions, gradePractice, type PracticeQuestion } from '@/lib/preparation';

const mocks = vi.hoisted(() => ({ push: vi.fn(), answer: vi.fn(), begin: vi.fn(), finish: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/actions-preparation', () => ({ beginPractice: mocks.begin, submitPracticeAnswer: mocks.answer, submitPractice: mocks.finish }));
const questions: PracticeQuestion[] = [1, 2].map(n => ({ id: `q${n}`, prompt: `Pregunta ${n}`, options: [{ id: 'a', label: `Opción A${n}` }, { id: 'b', label: `Opción B${n}` }], correctOptionId: 'a', explanation: `Explicación ${n}` }));
const first = gradePractice(questions, { q1: 'b' }).review.slice(0, 1);
const props = { courseId: 'course', quizId: 'quiz', attemptId: 'attempt', questions: publicPracticeQuestions(questions), initialFeedback: [], initialResult: null };
beforeEach(() => vi.resetAllMocks());

it('muestra devolución sólo después de guardar y no permite cambiar la respuesta confirmada', async () => {
  mocks.answer.mockResolvedValue({ success: true, attempt: { feedback: first, result: null } });
  const user = userEvent.setup(); render(<PracticeRunner {...props} />);
  expect(screen.getByRole('button', { name: 'Confirmar respuesta' })).toBeDisabled();
  await user.click(screen.getByRole('radio', { name: 'Opción B1' }));
  expect(screen.queryByText('Explicación 1')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Confirmar respuesta' }));
  expect(await screen.findByText('Explicación 1')).toBeVisible();
  expect(screen.getByText('Pregunta 1 · Incorrecta · Para repasar')).toBeVisible();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.queryByText('Explicación 2')).not.toBeInTheDocument();
  expect(mocks.answer).toHaveBeenCalledWith('course', 'attempt', 'q1', 'b');
  await user.click(screen.getByRole('button', { name: 'Siguiente pregunta' }));
  expect(screen.getByRole('radio', { name: 'Opción A2' })).toBeVisible();
});

it('recupera el avance del servidor y permite repasar la devolución anterior', async () => {
  const user = userEvent.setup(); render(<PracticeRunner {...props} initialFeedback={first} />);
  expect(screen.getByRole('heading', { name: 'Tenés una práctica en curso' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Continuar donde quedé' }));
  expect(screen.getByRole('radio', { name: 'Opción A2' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Pregunta anterior' }));
  expect(screen.getByText('Explicación 1')).toBeVisible();
  expect(mocks.begin).not.toHaveBeenCalled();
});

it('empezar de cero crea otro intento sin borrar el anterior', async () => {
  mocks.begin.mockResolvedValue({ success: true, id: 'fresh' });
  const user = userEvent.setup(); render(<PracticeRunner {...props} initialFeedback={first} />);
  await user.click(screen.getByRole('button', { name: 'Empezar de cero' }));
  expect(mocks.begin).toHaveBeenCalledWith('course', 'quiz', true);
  expect(mocks.push).toHaveBeenCalledWith('/estudiantes/cursos/course/preparacion/intentos/fresh');
});

it('si falla el guardado conserva la selección para reintentar y no revela solución', async () => {
  mocks.answer.mockResolvedValue({ success: false, error: 'No se pudo guardar.' });
  const user = userEvent.setup(); render(<PracticeRunner {...props} />);
  await user.click(screen.getByRole('radio', { name: 'Opción A1' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar respuesta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar.');
  expect(screen.getByRole('radio', { name: 'Opción A1' })).toBeChecked();
  expect(screen.queryByText('Explicación 1')).not.toBeInTheDocument();
});

it('muestra la última devolución antes del resumen completo', async () => {
  const grade = gradePractice(questions, { q1: 'b', q2: 'a' });
  const result = { ...grade, id: 'result', attempt: 'attempt', course: 'course', student: 'student', title: 'Práctica', created: '' };
  mocks.answer.mockResolvedValue({ success: true, attempt: { feedback: grade.review, result } });
  const user = userEvent.setup(); render(<PracticeRunner {...props} initialFeedback={first} />);
  await user.click(screen.getByRole('button', { name: 'Continuar donde quedé' }));
  await user.click(screen.getByRole('radio', { name: 'Opción A2' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar respuesta' }));
  expect(await screen.findByText('Explicación 2')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Resultado de práctica' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Ver resumen final' }));
  expect(screen.getByText('1 de 2 correctas · 50%')).toBeVisible();
  expect(screen.getByText('Explicación 1')).toBeVisible();
  expect(screen.getByText('Explicación 2')).toBeVisible();
});
