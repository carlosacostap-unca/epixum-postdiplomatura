import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { CourseExamEditor } from './CourseExamEditor';
import type { CourseExam } from '@/lib/course-exams';
const mocks = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/lib/actions-course-exams', () => ({ saveExam: mocks.save }));
const question = { id: 'morning-q', prompt: 'Enunciado de la mañana', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: 'Mañana' };
const exam: CourseExam = { id: 'exam', course: 'course', title: 'Parcial', description: '', status: 'draft', opensAt: '2026-10-28T11:00:00Z', closesAt: '2026-10-28T12:00:00Z', questions: [question], sessions: [{ id: 'night', label: 'Turno noche', opensAt: '2026-10-28T23:00:00Z', closesAt: '2026-10-29T00:00:00Z', questions: [{ ...question, id: 'night-q', prompt: 'Enunciado de la noche' }] }] };
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ success: true, data: 'exam' }); });
it('permite editar la versión nocturna conservando la mañana y guarda ambos horarios en UTC', async () => {
  const user = userEvent.setup(); render(<CourseExamEditor courseId="course" exam={exam} basePath="/parciales" />);
  await user.selectOptions(screen.getByLabelText('Turno que estás editando'), 'night');
  expect(screen.getByLabelText('Activación')).toHaveValue('2026-10-28T20:00');
  await user.clear(screen.getByLabelText('Enunciado')); await user.type(screen.getByLabelText('Enunciado'), 'Nueva pregunta nocturna');
  await user.selectOptions(screen.getByLabelText('Turno que estás editando'), 'primary');
  expect(screen.getByLabelText('Enunciado')).toHaveValue(question.prompt);
  expect(screen.getByLabelText('Activación')).toHaveValue('2026-10-28T08:00');
  await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  expect(mocks.save).toHaveBeenCalledWith('course', 'exam', expect.objectContaining({ status: 'draft', questions: [question], sessions: [expect.objectContaining({ questions: [expect.objectContaining({ prompt: 'Nueva pregunta nocturna' })], opensAt: '2026-10-28T23:00:00Z' })] }));
});
it('valida los turnos que no están a la vista antes de publicar', async () => {
  const user = userEvent.setup(); render(<CourseExamEditor courseId="course" exam={{ ...exam, sessions: [{ ...exam.sessions![0], opensAt: exam.opensAt, closesAt: exam.closesAt }] }} basePath="/parciales" />);
  await user.selectOptions(screen.getByLabelText('Estado'), 'published');
  await user.click(screen.getByRole('button', { name: 'Guardar y publicar parcial' }));
  expect(screen.getByRole('alert')).toHaveTextContent('superponerse'); expect(mocks.save).not.toHaveBeenCalled();
});
