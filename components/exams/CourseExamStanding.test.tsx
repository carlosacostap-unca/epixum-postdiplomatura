import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CourseExamStanding } from './CourseExamStanding';
import { CourseExamOverview } from './CourseExamOverview';
import { CourseExamFeedback } from './CourseExamFeedback';
import type { getCourseExams } from '@/lib/course-exam-data';
import type { ExamVisibleResult } from '@/lib/course-exams';

vi.mock('./ExamListRefresh', () => ({ ExamListRefresh: () => <button>Actualizar parciales</button> }));
it.each([[7, 'Desaprobado', null], [8, 'Aprobado', 'En condiciones de regularizar'], [13, 'Aprobado', 'En condiciones de regularizar'], [14, 'Aprobado', 'En condiciones de promocionar']])('muestra la condición correcta para %i aciertos', (correct, label, condition) => {
  render(<CourseExamStanding correct={correct} total={20} />);
  expect(screen.getByText(label!)).toBeVisible();
  if (condition) expect(screen.getByText(condition)).toBeVisible();
  else expect(screen.queryByText(/En condiciones de/)).not.toBeInTheDocument();
});
it('no califica un intento sin resultado como desaprobado', () => {
  const { container } = render(<CourseExamStanding correct={null} total={null} />); expect(container).toBeEmptyDOMElement();
});
const result = { id: 'result', attempt: 'attempt', finishedAt: '2026-10-23T12:30:00Z', reason: 'submitted' as const };
const data = { exams: [{ id: 'exam', title: 'Parcial', description: '', status: 'published', opensAt: '2026-10-23T12:00:00Z', closesAt: '2026-10-23T13:00:00Z' }], attempts: [{ id: 'attempt', exam: 'exam' }], results: [] } as unknown as Awaited<ReturnType<typeof getCourseExams>>;
it('oculta la condición de una entrega anticipada y la muestra con la nota liberada', () => {
  const view = render(<CourseExamOverview base="/estudiantes/cursos/course/parciales" manage={false} data={{ ...data, results: [{ ...result, feedbackAvailable: false }] }} />);
  expect(screen.queryByLabelText('Condición del parcial')).not.toBeInTheDocument();
  view.rerender(<CourseExamOverview base="/estudiantes/cursos/course/parciales" manage={false} data={{ ...data, results: [{ ...result, feedbackAvailable: true, correct: 14, total: 20, percentage: 70 }] }} />);
  expect(screen.getByLabelText('Condición del parcial')).toHaveTextContent('En condiciones de promocionar');
});
it('muestra las condiciones como elegibilidad del parcial en la devolución completa', () => {
  const released: Extract<ExamVisibleResult, { feedbackAvailable: true }> = { ...result, feedbackAvailable: true, correct: 8, total: 20, percentage: 40, selected: {}, review: [] };
  render(<CourseExamFeedback result={released} />);
  expect(screen.getByText('Nota: 4 / 10')).toBeVisible();
  expect(screen.getByLabelText('Condición del parcial')).toHaveTextContent('En condiciones de regularizar');
  expect(screen.queryByText('Regularizado')).not.toBeInTheDocument(); expect(screen.queryByText('Promocionado')).not.toBeInTheDocument();
});
