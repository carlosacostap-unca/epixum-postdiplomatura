import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import AssignmentAIConfigPanel from '@/app/docentes/cursos/[id]/tps/[tpId]/AssignmentAIConfigPanel';
import { saveAssignmentAIConfig } from '@/lib/actions-ai-config';

vi.mock('@/lib/actions-ai-config', () => ({ saveAssignmentAIConfig: vi.fn() }));

const config = {
  id: 'config-1', version: 2, active: true,
  criteria: [{ id: 'codigo', title: 'Código', description: 'Calidad', weight: 100 }],
  requiredChecks: ['README'], allowedVerdicts: ['Aprobado', 'Desaprobado'] as ('Aprobado' | 'Desaprobado')[],
  gradeEnabled: false, gradeMin: null, gradeMax: null, messageGuidance: 'Claro', additionalInstructions: '',
};

describe('AssignmentAIConfigPanel', () => {
  it('conserva y bloquea la configuración cuando el curso está deshabilitado', () => {
    render(<ToastProvider><AssignmentAIConfigPanel assignmentId="assignment-1" courseEnabled={false} initialConfig={config} /></ToastProvider>);
    expect(screen.getByText(/versión 2 se conserva/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar configuración/i })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /activar para este trabajo/i })).toBeDisabled();
  });

  it('guarda una configuración activa completa', async () => {
    vi.mocked(saveAssignmentAIConfig).mockResolvedValue({ success: true, config: { ...config, version: 3 } });
    const user = userEvent.setup();
    render(<ToastProvider><AssignmentAIConfigPanel assignmentId="assignment-1" courseEnabled initialConfig={config} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: /guardar configuración/i }));
    expect(saveAssignmentAIConfig).toHaveBeenCalledWith('assignment-1', expect.objectContaining({ active: true, criteria: [expect.objectContaining({ title: 'Código' })] }));
  });
});
