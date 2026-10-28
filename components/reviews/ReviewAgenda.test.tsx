import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ReviewAgenda } from './ReviewAgenda';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
const mocks = vi.hoisted(() => ({ reserve: vi.fn().mockResolvedValue({ success: true }), reschedule: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('@/lib/actions-review-appointments', () => ({ reserveReviewAction: mocks.reserve, rescheduleReviewBlockAction: mocks.reschedule }));

const data = {
  course: { id: 'course', teachers: ['teacher'] },
  review: { id: 'review', course: 'course', number: 1, title: 'Revisión', instructions: '', revision: '1', open: true },
  blocks: [], slots: [{ id: 'slot', teacher: 'teacher', startsAt: '2026-01-01T12:00:00Z', endsAt: '2026-01-01T12:15:00Z' }],
  bookings: [{ id: 'booking', slot: 'slot', student: 'student', status: 'passed', feedback: 'Buen trabajo' }],
  names: { student: 'Alumno', teacher: 'Docente' }, teachers: [{ id: 'teacher', name: 'Docente' }],
  teacherNotes: { booking: 'Observación interna confidencial' }, now: Date.parse('2026-01-02T00:00:00Z'),
} as unknown as Parameters<typeof ReviewAgenda>[0]['data'];

describe('resultado y notas privadas del turno', () => {
  beforeEach(() => { mocks.reserve.mockReset().mockResolvedValue({ success: true }); mocks.reschedule.mockReset().mockResolvedValue({ success: true }); });
  const futureBlock = { id: 'block', review: 'review', active: true, teacher: 'teacher00000001', date: '2026-10-29', start: '15:00', end: '17:00', startsAt: '2026-10-29T18:00:00Z', endsAt: '2026-10-29T20:00:00Z', duration: 15, breakEvery: 0, breakMinutes: 0, availableSlots: 7 };
  function editableAgenda(reserved: boolean) {
    return { ...data, course: { ...data.course, teachers: [futureBlock.teacher] }, teachers: [{ id: futureBlock.teacher, name: 'Docente' }], blocks: [futureBlock],
      slots: [{ id: 'slot', block: futureBlock.id, teacher: futureBlock.teacher, active: true, occupied: reserved, startsAt: futureBlock.startsAt, endsAt: '2026-10-29T18:15:00Z' }],
      bookings: reserved ? [{ ...data.bookings[0], status: 'reserved' }] : [],
    } as typeof data;
  }
  it('abre la edición completa en un diálogo con los datos de la franja y permite cerrar', () => {
    render(<ReviewAgenda data={editableAgenda(false)} mode="teacher" />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar franja' });
    expect(within(dialog).getByLabelText('Fecha')).toHaveValue('2026-10-29');
    expect(within(dialog).getByLabelText('Hora de inicio')).toHaveValue('15:00');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('permite cambiar jueves por viernes con reservas, únicamente después de previsualizar y confirmar', async () => {
    render(<ReviewAgenda data={editableAgenda(true)} mode="teacher" />);
    expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Retirar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar franja' });
    expect(within(dialog).getByText(/Esta franja tiene reservas pendientes/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Hora de inicio')).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Nueva fecha'), { target: { value: '2026-10-30' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previsualizar cambio de fecha' }));
    expect(within(dialog).getByText(/viernes, 30\/10\/2026, 15:00–17:00/)).toBeInTheDocument();
    expect(mocks.reschedule).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar cambio de fecha' }));
    expect(mocks.reschedule).toHaveBeenCalledWith('course', 'review', '1', 'block', '2026-10-30');
    await screen.findByText('La franja tiene reservas pendientes. Desde Editar podés cambiar la fecha conservando los turnos; no se puede retirar ni cambiar los horarios.');
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('descarta la confirmación anterior si se cambia la fecha y muestra errores sin cerrar', async () => {
    mocks.reschedule.mockResolvedValue({ success: false, error: 'Este docente ya tiene una franja superpuesta.' });
    render(<ReviewAgenda data={editableAgenda(true)} mode="teacher" />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar franja' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previsualizar cambio de fecha' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Elegí una fecha diferente');
    fireEvent.change(within(dialog).getByLabelText('Nueva fecha'), { target: { value: '2026-10-30' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previsualizar cambio de fecha' }));
    fireEvent.change(within(dialog).getByLabelText('Nueva fecha'), { target: { value: '2026-10-31' } });
    expect(within(dialog).queryByRole('button', { name: 'Confirmar cambio de fecha' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previsualizar cambio de fecha' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar cambio de fecha' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('superpuesta');
    expect(dialog).toBeInTheDocument();
  });
  it('abre también la creación en un diálogo sin reutilizar los datos editados', () => {
    render(<ReviewAgenda data={editableAgenda(false)} mode="teacher" />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar franja' }));
    expect(within(screen.getByRole('dialog', { name: 'Nueva franja docente' })).getByLabelText('Fecha')).toHaveValue('');
  });
  it('actualiza los datos del editor y descarta una previsualización al cambiar la revisión del servidor', () => {
    const agenda = editableAgenda(true);
    const { rerender } = render(<ReviewAgenda data={agenda} mode="teacher" />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar franja' });
    fireEvent.change(within(dialog).getByLabelText('Nueva fecha'), { target: { value: '2026-10-30' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previsualizar cambio de fecha' }));
    rerender(<ReviewAgenda data={{ ...agenda, review: { ...agenda.review, revision: '2' }, blocks: agenda.blocks.map(block => ({ ...block, date: '2026-10-31', startsAt: '2026-10-31T18:00:00Z', endsAt: '2026-10-31T20:00:00Z' })) }} mode="teacher" />);
    expect(within(dialog).getByLabelText('Nueva fecha')).toHaveValue('2026-10-31');
    expect(within(dialog).queryByRole('button', { name: 'Confirmar cambio de fecha' })).not.toBeInTheDocument();
  });
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
  it('muestra el enlace de la sala de la reserva asignada', () => {
    const agenda = { ...data, bookings: data.bookings.map(booking => ({ ...booking, status: 'reserved' })), meetingLinks: { booking: 'https://meet.google.com/abc-defg-hij' } } as typeof data;
    render(<ReviewAgenda data={agenda} mode="student" />);
    const link = screen.getByRole('link', { name: 'Unirme a la sala de reunión' });
    expect(link).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
  it('no muestra el enlace de una reserva cancelada', () => {
    const agenda = { ...data, bookings: data.bookings.map(booking => ({ ...booking, status: 'cancelled' })), meetingLinks: { booking: 'https://meet.google.com/abc-defg-hij' } } as typeof data;
    render(<ReviewAgenda data={agenda} mode="student" />);
    expect(screen.queryByRole('link', { name: 'Unirme a la sala de reunión' })).not.toBeInTheDocument();
  });
  it('permite solicitar una franja sin mostrar docentes ni elegir horarios individuales', async () => {
    const agenda = { ...data, bookings: [], blocks: [{ id: 'block', active: true, teacher: 'teacher', startsAt: '2026-01-03T12:00:00Z', endsAt: '2026-01-03T13:00:00Z', duration: 15, availableSlots: 3 }],
      slots: [{ id: 'specific-slot', block: 'block', active: true, teacher: 'teacher', startsAt: '2026-01-03T12:15:00Z', endsAt: '2026-01-03T12:30:00Z' }],
      names: { teacher: 'Nombre privado del docente' }, teachers: [{ id: 'teacher', name: 'Nombre privado del docente' }, { id: 'peer', name: 'Otro docente' }],
    } as unknown as typeof data;
    render(<ReviewAgenda data={agenda} mode="student" />);
    expect(screen.getByText('sábado, 03/01/2026, 09:00–10:00')).toBeInTheDocument();
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
    expect(dialog).toHaveAccessibleDescription('Franja: sábado, 03/01/2026, 09:00–10:00. Horario de Argentina (UTC−3).');
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
