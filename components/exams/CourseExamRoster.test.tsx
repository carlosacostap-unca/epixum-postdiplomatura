import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CourseExamRoster } from './CourseExamRoster';
import { CourseExamInspection } from './CourseExamInspection';
import type { getCourseExamRoster } from '@/lib/course-exam-data';
import type { ExamView } from '@/lib/course-exams';
vi.mock('./ExamListRefresh', () => ({ ExamListRefresh: () => <button>Actualizar parciales</button> }));
const result = { id: 'result', attempt: 'done', finishedAt: '2026-10-23T13:00:00Z', reason: 'expired' as const, feedbackAvailable: true as const, correct: 1, total: 2, percentage: 50 };
const data = {
  course: { id: 'course', title: 'Curso' },
  exams: [{ id: 'exam', title: 'Primer parcial' }],
  attempts: [{ id: 'done', exam: 'exam', created: '2026-10-23T12:00:00Z', deadline: '2026-10-23T13:00:00Z', expand: { student: { name: 'Ana Pérez', email: 'ana@example.invalid' } } }, { id: 'pending', exam: 'exam', created: '2026-10-23T12:00:00Z', deadline: '2026-10-23T13:00:00Z', expand: { student: { name: 'Bruno García', email: 'bruno@example.invalid' } } }],
  results: [result],
} as Awaited<ReturnType<typeof getCourseExamRoster>>;
it.each(['/admin/courses/course/parciales', '/docentes/cursos/course/parciales'])('lista alumnos, nota y enlace docente por entrega en %s', base => {
  render(<CourseExamRoster data={data} base={base} />);
  expect(screen.getByRole('heading', { name: 'Alumnos que rindieron' })).toBeVisible();
  expect(screen.getByText('1 entregas · 1 intentos en curso')).toBeVisible();
  // The shared table renders desktop rows and mobile cards.
  expect(screen.getAllByText('Ana Pérez')).toHaveLength(2);
  expect(screen.getAllByText('5 / 10')).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: 'Ver devolución completa de Ana Pérez' })[0]).toHaveAttribute('href', `${base}/intentos/done`);
  expect(screen.getByRole('heading', { name: 'En curso' })).toBeVisible();
  expect(screen.getAllByText('Pendiente de entrega')).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: 'Ver avance de Bruno García' })[0]).toHaveAttribute('href', `${base}/intentos/pending`);
});
it('identifica al alumno y muestra la nota, las correcciones y explicaciones en su devolución', () => {
  const question = { id: 'q1', prompt: 'Pregunta de ejemplo', options: [{ id: 'a', label: 'Opción incorrecta' }, { id: 'b', label: 'Opción correcta' }], correctOptionId: 'b', explanation: 'Explicación detallada.' };
  const attempt: ExamView = { id: 'done', examId: 'exam', title: 'Primer parcial', description: '', questions: [], selected: { q1: 'a' }, deadline: '2026-10-23T13:00:00Z', serverNow: 0, student: { name: 'Ana Pérez', email: 'ana@example.invalid' }, result: { ...result, correct: 0, percentage: 0, selected: { q1: 'a' }, review: [{ question, selectedOptionId: 'a', correct: false }, { question: { ...question, id: 'q2' }, selectedOptionId: null, correct: false }] } };
  render(<CourseExamInspection attempt={attempt} backPath="/admin/courses/course/parciales/exam/resultados" />);
  expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible();
  expect(screen.getByText('ana@example.invalid')).toBeVisible();
  expect(screen.getByText('Nota: 0 / 10')).toBeVisible();
  expect(screen.getByText('Respuesta del alumno')).toBeVisible();
  expect(screen.getAllByText('Respuesta correcta')).toHaveLength(2);
  expect(screen.getAllByText('Explicación detallada.')).toHaveLength(2);
  expect(screen.getByText('El alumno no seleccionó una opción. Esta pregunta suma cero puntos.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Volver a alumnos y notas' })).toHaveAttribute('href', '/admin/courses/course/parciales/exam/resultados');
});
