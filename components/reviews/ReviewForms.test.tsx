import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReviewBlockEditor, ReviewEvaluationForm } from './ReviewForms';
import type { Review } from '@/lib/review-appointments';
const mocks = vi.hoisted(() => ({ saveBlock: vi.fn(), evaluate: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }) }));
vi.mock('@/lib/actions-review-appointments', () => ({ saveReviewBlockAction: mocks.saveBlock, evaluateReviewAction: mocks.evaluate }));
const review: Review = { id: 'review1', course: 'course1', number: 1, title: 'Avances', instructions: '', open: true, revision: 'version1' };
describe('formularios de revisiones', () => {
  beforeEach(() => { mocks.saveBlock.mockReset().mockResolvedValue({ success: true }); mocks.evaluate.mockReset().mockResolvedValue({ success: true }); });
  it('previsualiza descansos sin crear ni asignar alumnos y exige confirmar', async () => {
    render(<ReviewBlockEditor courseId="course1" review={review} teachers={[{ id: 'teacher00000001', name: 'Ana' }]} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-20' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '19:00' } });
    fireEvent.change(screen.getByLabelText('Descanso cada N turnos'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Minutos de descanso'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Previsualizar turnos' }));
    expect(screen.getByText('3 turnos disponibles para reservar')).toBeInTheDocument();
    expect(screen.getByText('18:30–18:40')).toBeInTheDocument();
    expect(mocks.saveBlock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Crear turnos libres' }));
    expect(mocks.saveBlock).toHaveBeenCalledWith('course1', 'review1', 'version1', null, expect.objectContaining({ breakEvery: 2, breakMinutes: 10, teacher: 'teacher00000001' }));
    await screen.findByText('Cambios guardados.');
  });
  it('invalida una vista previa si se cambia la duración', () => {
    render(<ReviewBlockEditor courseId="course1" review={review} teachers={[{ id: 'teacher00000001', name: 'Ana' }]} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Previsualizar turnos' }));
    expect(screen.getByRole('button', { name: 'Crear turnos libres' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Minutos por turno'), { target: { value: '30' } });
    expect(screen.queryByRole('button', { name: 'Crear turnos libres' })).not.toBeInTheDocument();
  });
  it('un ausente queda no aprobado aunque antes se hubiera elegido aprobado', async () => {
    render(<ReviewEvaluationForm courseId="course1" reviewId="review1" bookingId="booking1" />);
    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'passed' } });
    fireEvent.change(screen.getByLabelText('Asistencia'), { target: { value: 'absent' } });
    expect(screen.getByLabelText('Resultado')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Devolución para el alumno'), { target: { value: 'Reprogramar.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar evaluación definitiva' }));
    expect(mocks.evaluate).toHaveBeenCalledWith('course1', 'review1', 'booking1', { attendance: 'absent', status: 'not_passed', feedback: 'Reprogramar.' });
    await screen.findByText('Cambios guardados.');
  });
});
