import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import type { Delivery } from '@/types';
import TpStudentDelivery from './TpStudentDelivery';
import { updateDeliveryWithUrl } from '@/lib/actions';
import { buildAIPreevaluationFeedback } from '@/lib/ai-preevaluation-report';
import { reportFixture } from '@/test/ai-preevaluation-report-fixture';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/actions', () => ({
  createDeliveryWithFiles: vi.fn(),
  createDeliveryWithUrl: vi.fn(),
  getStudentDeliveryFileDownloadUrl: vi.fn(),
  getUploadUrl: vi.fn(),
  updateDeliveryWithFiles: vi.fn(),
  updateDeliveryWithUrl: vi.fn(),
}));

function delivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 'delivery0000001', collectionId: 'deliveries', collectionName: 'deliveries',
    created: '2026-09-01T10:00:00.000Z', updated: '2026-09-02T10:00:00.000Z',
    assignment: 'assignment-1', student: 'student-1',
    repositoryUrl: JSON.stringify({ type: 'url', url: 'https://github.com/example/tp' }),
    status: 'pending', submissionVersion: 1, evaluatedVersion: 0, submittedAt: '2026-09-01T10:00:00.000Z', resubmissionCount: 0, history: [],
    ...overrides,
  };
}

function renderDelivery(record: Delivery, dueDate = '2020-01-01T00:00:00.000Z') {
  return render(<ToastProvider><TpStudentDelivery assignmentId="assignment-1" courseId="course-1" delivery={record} dueDate={dueDate} /></ToastProvider>);
}

describe('entrega estudiantil versionada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateDeliveryWithUrl).mockResolvedValue({ success: true, resubmitted: true });
  });

  it('habilita el reenvío solicitado aunque haya vencido el plazo', async () => {
    const user = userEvent.setup();
    renderDelivery(delivery({ status: 'published', verdict: 'Corregir y reenviar', feedback: 'Corregí la validación.', grade: 4, evaluatedVersion: 1 }));
    expect(screen.getByText('Corrección solicitada')).toBeInTheDocument();
    const edit = screen.getByRole('button', { name: /Reenviar corrección/ });
    await user.click(edit);
    await user.click(screen.getByRole('button', { name: /Reenviar corrección/ }));
    expect(updateDeliveryWithUrl).toHaveBeenCalledWith('delivery0000001', 'course-1', 'assignment-1', 'https://github.com/example/tp');
  });

  it('muestra el reenvío pendiente y conserva la devolución anterior', () => {
    renderDelivery(delivery({
      status: 'pending', submissionVersion: 2, evaluatedVersion: 1, submittedAt: '2026-09-03T10:00:00.000Z', resubmissionCount: 1,
      history: [{ version: 1, submittedAt: '2026-09-01T10:00:00.000Z', repositoryUrl: 'https://files.example/v1.zip', evaluation: { verdict: 'Corregir y reenviar', feedback: 'Corregí la validación.', grade: 4 } }],
    }));
    expect(screen.getByText('Reenviado · pendiente de revisión')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Devolución anterior' })).toBeInTheDocument();
    expect(screen.getAllByText('Corregí la validación.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Actualizar entrega' })).not.toBeInTheDocument();
  });

  it.each(['Aprobado', 'Desaprobado'] as const)('cierra modificaciones después del resultado %s', (verdict) => {
    renderDelivery(delivery({ status: 'published', verdict, feedback: 'Resultado final.', evaluatedVersion: 1 }));
    expect(screen.queryByRole('button', { name: /Actualizar|Reenviar/ })).not.toBeInTheDocument();
    expect(screen.getByText(verdict === 'Aprobado' ? 'Evaluado · aprobado' : 'Evaluado · desaprobado')).toBeInTheDocument();
  });

  it('muestra todo el informe publicado al alumno sin consultar intentos privados', () => {
    const feedback = buildAIPreevaluationFeedback(reportFixture);
    renderDelivery(delivery({ status: 'published', verdict: 'Corregir y reenviar', feedback, grade: 5, evaluatedVersion: 1 }));
    const published = screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === feedback);
    expect(published).toHaveClass('whitespace-pre-wrap');
    for (const criterion of reportFixture.result.criteria) expect(published.textContent).toContain(criterion.observation);
    expect(published.textContent).toContain('views/layout.ejs: archivo de texto fuera de límite');
    expect(published.textContent).toBe(feedback);
  });

  it('no expone la devolución de un borrador al alumno', () => {
    const feedback = buildAIPreevaluationFeedback(reportFixture);
    renderDelivery(delivery({ status: 'draft', feedback }));
    expect(screen.queryByText(/INFORME DETALLADO DE LA EVALUACIÓN/)).not.toBeInTheDocument();
  });

  it('mantiene legible el informe íntegro en la devolución anterior y el historial', () => {
    const feedback = buildAIPreevaluationFeedback(reportFixture);
    renderDelivery(delivery({ status: 'pending', submissionVersion: 2, evaluatedVersion: 1, resubmissionCount: 1, history: [{ version: 1, submittedAt: '2026-09-01T10:00:00.000Z', evaluation: { feedback, verdict: 'Corregir y reenviar', grade: 5 } }] }));
    const copies = screen.getAllByText((_, element) => element?.tagName === 'P' && element.textContent === feedback);
    expect(copies).toHaveLength(2);
    for (const copy of copies) expect(copy.textContent).toBe(feedback);
  });
});
