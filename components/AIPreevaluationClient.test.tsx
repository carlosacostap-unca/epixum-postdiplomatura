import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import AIPreevaluationClient from '@/app/assignments/[id]/deliveries/[deliveryId]/AIPreevaluationClient';
import { requestAIPreevaluation } from '@/app/actions/openai';
import { updateDeliveryEvaluation } from '@/lib/actions';

vi.mock('@/app/actions/openai', () => ({ requestAIPreevaluation: vi.fn() }));
vi.mock('@/lib/actions', () => ({ updateDeliveryEvaluation: vi.fn() }));

const attempt = {
  id: 'attempt-1', status: 'completed' as const, commitSha: 'a'.repeat(40), captureSource: 'student-submission' as const,
  model: 'gpt-5.6-luna', configVersion: 2, created: '2026-08-22', updated: '2026-08-22',
  coverage: { commitSha: 'a'.repeat(40), includedFiles: ['src/index.ts'], omittedFiles: [{ path: '.env', reason: 'archivo sensible' }], includedBytes: 100, expandedBytes: 200, totalEntries: 2, partial: true },
  result: { verdict: 'Corregir y reenviar' as const, suggestedGrade: null, criteria: [{ criterionId: 'c1', criterion: 'Código', outcome: 'parcial' as const, observation: 'Falta validar' }], strengths: ['Buena estructura'], corrections: ['Agregar validación'], warnings: ['No se ejecutó'], proposedMessage: 'Revisá la validación.' },
};

const base = { deliveryId: 'delivery0000001', aiEligible: true, repositoryUrl: 'https://github.com/epixum/tp', repositoryFullName: 'epixum/tp', providerStatus: { openaiConfigured: true, githubTokenConfigured: true, githubPublicAccessAvailable: true }, initialGrade: null, initialFeedback: '', initialStatus: 'pending' as const };

describe('AIPreevaluationClient', () => {
  beforeEach(() => vi.clearAllMocks());
  it('muestra cobertura parcial, resultado y permite descartar sin publicar', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><AIPreevaluationClient {...base} initialAttempt={attempt} /></ToastProvider>);
    expect(screen.getByText('Cobertura analizada')).toBeInTheDocument();
    expect(screen.getAllByText(/Revisá la validación/).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Revisá la validación.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /descartar sugerencia/i }));
    expect(screen.queryByText('Resultados por criterio')).not.toBeInTheDocument();
    expect(updateDeliveryEvaluation).not.toHaveBeenCalled();
  });

  it('presenta fallo recuperable y permite reintentar', async () => {
    vi.mocked(requestAIPreevaluation).mockResolvedValue({ success: false, error: 'GitHub alcanzó el límite.' });
    const user = userEvent.setup();
    render(<ToastProvider><AIPreevaluationClient {...base} initialAttempt={null} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: /solicitar preevaluación con ia/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub alcanzó el límite.');
    expect(screen.getByRole('button', { name: /solicitar preevaluación con ia/i })).toBeEnabled();
  });

  it('expone el estado de carga mientras procesa', async () => {
    let resolveRequest!: (value: { success: false; error: string }) => void;
    vi.mocked(requestAIPreevaluation).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const user = userEvent.setup();
    render(<ToastProvider><AIPreevaluationClient {...base} initialAttempt={null} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: /solicitar preevaluación con ia/i }));
    expect(screen.getByRole('button', { name: /analizando repositorio/i })).toBeDisabled();
    resolveRequest({ success: false, error: 'Fallo recuperable' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo recuperable');
  });

  it('adopta la sugerencia como borrador y requiere confirmación para publicar', async () => {
    vi.mocked(updateDeliveryEvaluation).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ToastProvider><AIPreevaluationClient {...base} initialAttempt={attempt} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: /guardar borrador/i }));
    expect(updateDeliveryEvaluation).toHaveBeenCalledWith('delivery0000001', null, 'Revisá la validación.', 'Corregir y reenviar', 'draft', 'attempt-1');
    await user.click(screen.getByRole('button', { name: /publicar evaluación/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /publicar ahora/i }));
    expect(updateDeliveryEvaluation).toHaveBeenCalledWith('delivery0000001', null, 'Revisá la validación.', 'Corregir y reenviar', 'published', 'attempt-1');
  });
});
