import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AttendanceSheet } from './AttendanceSheet';
import type { AttendanceReport } from '@/lib/course-attendance';
const m = vi.hoisted(() => ({ toggle: vi.fn(), correct: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock('@/lib/actions-course-attendance', () => ({ setCourseAttendance: m.toggle, correctCourseAttendance: m.correct }));
const report: AttendanceReport = { classes: [{ id: 'c', title: 'Clase 1', date: '', phase: 'closed' }], rows: [{ student: { id: 's', name: 'Alumno Prueba', email: 'alumno@example.com', enrolledAt: '' }, cells: { c: { status: 'present', firstJoinedAt: '2026-10-05T12:00:00Z', editable: true, corrections: [] } } }] };
beforeEach(() => { m.toggle.mockReset().mockResolvedValue({ success: true }); m.correct.mockReset().mockResolvedValue({ success: true }); m.refresh.mockReset(); });
it('el bedel consulta, filtra y actualiza sin controles de edición', async () => {
  const user = userEvent.setup();
  render(<AttendanceSheet courseId="course" enabled report={report} readOnly />);
  expect(screen.getByText('Presente')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Activar asistencia|Desactivar asistencia|Corregir/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Buscar alumno'), 'Prueba');
  expect(screen.getByText('Alumno Prueba')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Actualizar planilla' }));
  expect(m.refresh).toHaveBeenCalled();
  expect(m.toggle).not.toHaveBeenCalled();
  expect(m.correct).not.toHaveBeenCalled();
});
it('activa la opción y explica alcance en vivo y para sesiones nuevas', async () => {
  render(<AttendanceSheet courseId="course" enabled={false} report={report} />);
  expect(screen.getByText(/El repaso posterior no cuenta/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Activar asistencia' }));
  expect(m.toggle).toHaveBeenCalledWith('course', true);
  expect(await screen.findByRole('status')).toHaveTextContent(/activada/);
});
it('corrige solo a presente o ausente y actualiza la planilla al guardar', async () => {
  const user = userEvent.setup(); render(<AttendanceSheet courseId="course" enabled report={report} />);
  await user.click(screen.getByRole('button', { name: /Corregir Alumno/ }));
  expect(screen.getByLabelText('Estado de asistencia').querySelectorAll('option')).toHaveLength(2);
  await user.selectOptions(screen.getByLabelText('Estado de asistencia'), 'absent');
  await user.click(screen.getByRole('button', { name: 'Guardar corrección' }));
  await waitFor(() => expect(m.correct).toHaveBeenCalledWith('course', { studentId: 's', classId: 'c', status: 'absent' }));
  expect(m.refresh).toHaveBeenCalled();
});
it('muestra errores sin anunciar guardado y filtra alumnos', async () => {
  m.toggle.mockResolvedValue({ success: false, error: 'No se guardó' });
  const user = userEvent.setup(); render(<AttendanceSheet courseId="course" enabled report={report} />);
  await user.click(screen.getByRole('button', { name: 'Desactivar asistencia' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Buscar alumno'), 'inexistente');
  expect(screen.getByText('No hay alumnos para mostrar.')).toBeInTheDocument();
});
