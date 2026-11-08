import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewWorkspace from './ReviewWorkspace';
import AIPreevaluationClient from '@/app/assignments/[id]/deliveries/[deliveryId]/AIPreevaluationClient';
import { ToastProvider } from '@/components/ui';
import { updateDeliveryEvaluation } from '@/lib/actions';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/actions', () => ({ updateDeliveryEvaluation: vi.fn() }));
vi.mock('@/app/actions/openai', () => ({ requestAIPreevaluation: vi.fn() }));

const base = { deliveryId: 'delivery0000001', submissionVersion: 2, aiEligible: false, providerStatus: { openaiConfigured: false, githubTokenConfigured: false, githubPublicAccessAvailable: true }, initialAttempt: null, initialStatus: 'pending' as const };

function workspace(id = base.deliveryId) {
  return <ToastProvider><ReviewWorkspace key={id} backHref="/docentes/cursos/c1/tps/tp1?reviewState=unreviewed#entregas" next={{ href: '/assignments/tp1/deliveries/d2?reviewState=unreviewed', student: 'Beatriz' }} position={1} total={2} filtered>
    <AIPreevaluationClient {...base} deliveryId={id} submission={<p>Material de {id}</p>} />
  </ReviewWorkspace></ToastProvider>;
}

describe('espacio de corrección', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(updateDeliveryEvaluation).mockResolvedValue({ success: true }); });

  it('permite seguir editando o descartar antes de pasar al siguiente estudiante', async () => {
    const user = userEvent.setup();
    render(workspace());
    expect(screen.getByText('1 de 2 entregas · Vista filtrada')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Anterior/ })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Devolución para el estudiante'), 'Revisar la conclusión');
    await user.click(screen.getByRole('link', { name: 'Siguiente: Beatriz' }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText('Devolución para el estudiante')).toHaveValue('Revisar la conclusión');
    await user.click(screen.getByRole('link', { name: 'Siguiente: Beatriz' }));
    await user.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(push).toHaveBeenCalledWith('/assignments/tp1/deliveries/d2?reviewState=unreviewed');
    expect(updateDeliveryEvaluation).not.toHaveBeenCalled();
  });

  it('actualiza el estado y elimina la advertencia sólo después de guardar', async () => {
    const user = userEvent.setup();
    render(workspace());
    await user.type(screen.getByLabelText('Devolución para el estudiante'), 'Revisar la conclusión');
    const before = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByText('Estado actual: borrador. Sin cambios pendientes.')).toBeInTheDocument();
    await waitFor(() => {
      const after = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(after);
      expect(after.defaultPrevented).toBe(false);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('conserva el texto ante fallo y no permite navegar durante el guardado', async () => {
    let complete!: (value: { success: false; error: string }) => void;
    vi.mocked(updateDeliveryEvaluation).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const user = userEvent.setup();
    render(workspace());
    await user.type(screen.getByLabelText('Devolución para el estudiante'), 'Mi devolución');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(screen.getByRole('button', { name: 'Publicar evaluación' })).toBeDisabled();
    expect(screen.getByLabelText('Devolución para el estudiante')).toBeDisabled();
    await user.click(screen.getByRole('link', { name: 'Siguiente: Beatriz' }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    complete({ success: false, error: 'La entrega cambió de versión.' });
    expect(await screen.findByRole('alert')).toHaveTextContent('La entrega cambió de versión.');
    expect(screen.getByLabelText('Devolución para el estudiante')).toHaveValue('Mi devolución');
    await user.click(screen.getByRole('link', { name: 'Volver a entregas' }));
    expect(screen.getByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeInTheDocument();
  });

  it('publica con confirmación y no ofrece volver a borrador ni hereda el texto al cambiar estudiante', async () => {
    const user = userEvent.setup();
    const view = render(workspace());
    await user.type(screen.getByLabelText('Devolución para el estudiante'), 'Buen trabajo');
    await user.selectOptions(screen.getByLabelText('Veredicto'), 'Aprobado');
    await user.click(screen.getByRole('button', { name: 'Publicar evaluación' }));
    expect(updateDeliveryEvaluation).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Publicar ahora' }));
    expect(await screen.findByText('Estado actual: publicada. Sin cambios pendientes.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar borrador' })).not.toBeInTheDocument();
    view.rerender(workspace('delivery0000002'));
    expect(screen.getByLabelText('Devolución para el estudiante')).toHaveValue('');
    expect(screen.getByLabelText('Veredicto')).toHaveValue('');
    expect(screen.getByText('Material de delivery0000002')).toBeInTheDocument();
  });

  it('recupera un error de red sin perder cambios ni dejar botones bloqueados', async () => {
    vi.mocked(updateDeliveryEvaluation).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(workspace());
    fireEvent.change(screen.getByLabelText('Devolución para el estudiante'), { target: { value: 'Texto importante' } });
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conservamos tus cambios');
    expect(screen.getByLabelText('Devolución para el estudiante')).toHaveValue('Texto importante');
    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeEnabled();
  });
});
