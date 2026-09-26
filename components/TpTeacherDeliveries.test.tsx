import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import type { Delivery } from '@/types';
import TpTeacherDeliveries from './TpTeacherDeliveries';
import { updateDeliveryEvaluation } from '@/lib/actions';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/actions', () => ({
  getTeacherDeliveryFileDownloadUrl: vi.fn(),
  updateDeliveryEvaluation: vi.fn(),
}));

function delivery(id: string, studentName: string, overrides: Partial<Delivery> = {}): Delivery {
  return {
    id, collectionId: 'deliveries', collectionName: 'deliveries',
    created: '2026-09-01T10:00:00.000Z', updated: '2026-09-02T10:00:00.000Z',
    assignment: 'assignment-1', student: `student-${id}`,
    repositoryUrl: JSON.stringify({ type: 'url', url: `https://github.com/example/${id}` }),
    status: 'pending', submissionVersion: 1, evaluatedVersion: 0, submittedAt: '2026-09-01T10:00:00.000Z', resubmissionCount: 0, history: [],
    expand: { student: { id: `student-${id}`, firstName: studentName, lastName: '', name: studentName, email: `${studentName}@example.com` } as never },
    ...overrides,
  };
}

const deliveries = [
  delivery('delivery0000001', 'Ada'),
  delivery('delivery0000002', 'Grace', {
    submissionVersion: 2, evaluatedVersion: 1, resubmissionCount: 1, submittedAt: '2026-09-03T10:00:00.000Z',
    history: [{ version: 1, submittedAt: '2026-09-01T10:00:00.000Z', contentUnavailable: true, evaluation: { verdict: 'Corregir y reenviar', feedback: 'Agregar pruebas.' } }],
  }),
];

function renderList() {
  return render(<ToastProvider><TpTeacherDeliveries deliveries={deliveries} courseId="course-1" assignmentId="assignment-1" /></ToastProvider>);
}

describe('listado docente de reenvíos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateDeliveryEvaluation).mockResolvedValue({ success: true });
  });

  it('cuenta y filtra los reenvíos como estado propio', async () => {
    const user = userEvent.setup();
    renderList();
    expect(screen.getByRole('option', { name: 'Reenviadas (1)' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Estado de revisión'), 'resubmitted');
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    expect(screen.getByText('Reenviado')).toBeInTheDocument();
  });

  it('muestra el historial y publica contra la versión visible', async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole('button', { name: /Grace/ }));
    expect(screen.getByRole('heading', { name: 'Historial de intentos' })).toBeInTheDocument();
    expect(screen.getByText('Agregar pruebas.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Devolución para el estudiante'), 'Ahora está correcto.');
    await user.selectOptions(screen.getByLabelText('Veredicto'), 'Aprobado');
    await user.click(screen.getByRole('button', { name: /Publicar evaluación/ }));
    await user.click(screen.getByRole('button', { name: 'Publicar ahora' }));
    expect(updateDeliveryEvaluation).toHaveBeenCalledWith('delivery0000002', null, 'Ahora está correcto.', 'Aprobado', 'published', 2);
  });
});
