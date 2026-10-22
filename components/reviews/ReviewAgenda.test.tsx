import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReviewAgenda } from './ReviewAgenda';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
const mocks = vi.hoisted(() => ({ reserve: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('@/lib/actions-review-appointments', () => ({ reserveReviewAction: mocks.reserve }));

const data = {
  course: { id: 'course', teachers: ['teacher'] },
  review: { id: 'review', course: 'course', number: 1, title: 'Revisión', instructions: '', revision: '1', open: true },
  blocks: [], slots: [{ id: 'slot', teacher: 'teacher', startsAt: '2026-01-01T12:00:00Z', endsAt: '2026-01-01T12:15:00Z' }],
  bookings: [{ id: 'booking', slot: 'slot', student: 'student', status: 'passed', feedback: 'Buen trabajo' }],
  names: { student: 'Alumno', teacher: 'Docente' }, teachers: [{ id: 'teacher', name: 'Docente' }],
  teacherNotes: { booking: 'Observación interna confidencial' }, now: Date.parse('2026-01-02T00:00:00Z'),
} as unknown as Parameters<typeof ReviewAgenda>[0]['data'];

describe('resultado y notas privadas del turno', () => {
  beforeEach(() => mocks.reserve.mockReset().mockResolvedValue({ success: true }));
  it('muestra resultado, devolución y notas a los docentes', () => {
    render(<ReviewAgenda data={data} mode="teacher" />);
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Buen trabajo')).toBeInTheDocument();
    expect(screen.getByText('Observación interna confidencial')).toBeInTheDocument();
  });
  it('muestra resultado y devolución al alumno sin renderizar notas privadas', () => {
    render(<ReviewAgenda data={data} mode="student" />);
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Buen trabajo')).toBeInTheDocument();
    expect(screen.queryByText('Observación interna confidencial')).not.toBeInTheDocument();
    expect(screen.queryByText('Notas privadas · Solo docentes')).not.toBeInTheDocument();
  });
  it('permite solicitar una franja sin mostrar docentes ni elegir horarios individuales', async () => {
    const agenda = { ...data, bookings: [], blocks: [{ id: 'block', active: true, teacher: 'teacher', startsAt: '2026-01-03T12:00:00Z', endsAt: '2026-01-03T13:00:00Z', duration: 15, availableSlots: 3 }],
      slots: [{ id: 'specific-slot', block: 'block', active: true, teacher: 'teacher', startsAt: '2026-01-03T12:15:00Z', endsAt: '2026-01-03T12:30:00Z' }],
      names: { teacher: 'Nombre privado del docente' }, teachers: [{ id: 'teacher', name: 'Nombre privado del docente' }, { id: 'peer', name: 'Otro docente' }],
    } as unknown as typeof data;
    render(<ReviewAgenda data={agenda} mode="student" />);
    expect(screen.getByText('03/01/2026, 09:00–10:00')).toBeInTheDocument();
    expect(screen.queryByText('09:15–09:30')).not.toBeInTheDocument();
    expect(screen.queryByText('Nombre privado del docente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrar por docente')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reservar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar turno en esta franja' }));
    expect(mocks.reserve).toHaveBeenCalledWith('course', 'review', 'block');
    await screen.findByText('Cambios guardados.');
  });
  it('inhabilita la solicitud de una franja sin cupos', () => {
    const agenda = { ...data, bookings: [], blocks: [{ id: 'block', active: true, startsAt: '2026-01-03T12:00:00Z', endsAt: '2026-01-03T13:00:00Z', duration: 15, availableSlots: 0 }] } as unknown as typeof data;
    render(<ReviewAgenda data={agenda} mode="student" />);
    expect(screen.getByRole('button', { name: 'Solicitar turno en esta franja' })).toBeDisabled();
  });
  it('muestra las indicaciones y solicita el turno únicamente después de confirmar', async () => {
    const agenda = { ...data, bookings: [], review: { ...data.review, bookingMessage: 'Traé tu proyecto.\nRevisá los requisitos antes de reservar.' }, blocks: [{ id: 'block', active: true, startsAt: '2026-01-03T12:00:00Z', endsAt: '2026-01-03T13:00:00Z', duration: 15, availableSlots: 2 }] } as unknown as typeof data;
    render(<ReviewAgenda data={agenda} mode="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar turno en esta franja' }));
    const dialog = screen.getByRole('dialog', { name: 'Antes de solicitar tu turno' });
    expect(dialog).toHaveTextContent('Traé tu proyecto.');
    expect(dialog).toHaveTextContent('Revisá los requisitos antes de reservar.');
    expect(dialog).toHaveAccessibleDescription('Franja: 03/01/2026, 09:00–10:00. Horario de Argentina (UTC−3).');
    expect(mocks.reserve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver sin reservar' }));
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar turno en esta franja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar solicitud' }));
    expect(mocks.reserve).toHaveBeenCalledWith('course', 'review', 'block', agenda.review.bookingMessage);
    await screen.findByText('Cambios guardados.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('muestra un error de reserva dentro del diálogo sin confirmar un turno', async () => {
    mocks.reserve.mockResolvedValue({ success: false, error: 'Las indicaciones cambiaron. Actualizá la página.' });
    const agenda = { ...data, bookings: [], review: { ...data.review, bookingMessage: 'Traé tu proyecto.' }, blocks: [{ id: 'block', active: true, startsAt: '2026-01-03T12:00:00Z', endsAt: '2026-01-03T13:00:00Z', duration: 15, availableSlots: 2 }] } as unknown as typeof data;
    render(<ReviewAgenda data={agenda} mode="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar turno en esta franja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar solicitud' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Las indicaciones cambiaron.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
