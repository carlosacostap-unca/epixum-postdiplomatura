import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StudentProgressDashboard } from './StudentProgressDashboard';
import { StudentProgressDetail } from './StudentProgressDetail';
import { parseProgressFilters, type StudentProgressRow } from '@/lib/student-progress';
import type { getStudentProgress } from '@/lib/student-progress-data';
import type { Course } from '@/types';
vi.mock('@/components/exams/ExamListRefresh', () => ({ ExamListRefresh: ({ label }: { label: string }) => <button>{label}</button> }));
const exam = { id: 'exam', title: 'Primer parcial', status: 'published', opensAt: '2026-10-01T12:00:00Z', closesAt: '2026-10-23T12:00:00Z', state: 'submitted' as const, attemptId: 'attempt', startedAt: '2026-10-23T11:00:00Z', finishedAt: '2026-10-23T12:00:00Z', grade: 0, correct: 0, total: 2, reason: 'submitted' };
const student: StudentProgressRow = { id: 'ana', name: 'Ana Pérez', email: 'ana@example.invalid', enrolledAt: '2026-10-01T12:00:00Z', lastActivity: '2026-10-23T12:00:00Z', preparation: { attempts: 2, completedAttempts: 1, publishedCompleted: 1, publishedTotal: 2, latestGrade: 5, bestGrade: 5 }, exams: [exam], submittedExams: 1, latestExamGrade: 0 };
const data = { course: { id: 'course' } as Course, rows: [student, { ...student, id: 'bruno', name: 'Bruno', email: 'bruno@example.invalid', exams: [{ ...exam, state: 'not_started', grade: null, attemptId: null }], submittedExams: 0, latestExamGrade: null }], exams: [exam], preparationEnabled: true, examsEnabled: true, serverNow: Date.parse('2026-10-23T15:00:00Z'), practiceHistory: [{ id: 'practice', quiz: 'quiz', student: 'ana', title: 'Práctica inicial', created: '2026-10-22T12:00:00Z', updated: '2026-10-22T12:00:00Z', finishedAt: '2026-10-22T12:10:00Z', grade: 5, correct: 1, total: 2, answerCount: 2 }] } as Awaited<ReturnType<typeof getStudentProgress>>;
it('muestra resumen, filtros GET combinables y enlaces de detalle que conservan los criterios', () => {
  render(<StudentProgressDashboard data={data} filters={parseProgressFilters({ parcial: 'exam', nota_max: '0' })} />);
  expect(screen.getByRole('form', { name: 'Filtrar estudiantes' })).toHaveAttribute('method', 'get');
  expect(screen.getByLabelText('Parcial')).toHaveValue('exam'); expect(screen.getByLabelText('Nota máxima de parcial')).toHaveValue(0);
  expect(screen.getByRole('status')).toHaveTextContent('1 de 2 estudiantes coinciden');
  expect(screen.queryByText('Bruno')).not.toBeInTheDocument(); expect(screen.getAllByText('0 / 10')).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: 'Ver detalle de Ana Pérez' })[0]).toHaveAttribute('href', '/docentes/cursos/course/estudiantes/ana?parcial=exam&nota_max=0');
  expect(screen.getByText('Con actividad de preparación')).toBeVisible();
});
it('ofrece historial de preparación y devolución completa, con regreso al listado filtrado', () => {
  render(<StudentProgressDetail data={{ ...data, rows: [student] }} filters={parseProgressFilters({ q: 'Ana', p: '2' })} />);
  expect(screen.getByRole('heading', { name: 'Historial de Ana Pérez' })).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Consultar intento' })[0]).toHaveAttribute('href', '/docentes/cursos/course/preparacion/intentos/practice');
  expect(screen.getAllByRole('link', { name: 'Ver devolución completa' })[0]).toHaveAttribute('href', '/docentes/cursos/course/parciales/intentos/attempt');
  expect(screen.getByRole('link', { name: 'Volver al listado con mis filtros' })).toHaveAttribute('href', '/docentes/cursos/course/estudiantes?q=Ana&p=2');
});
