import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import type { Assignment, Delivery } from '@/types';
import AssignmentLateSubmissionField from './AssignmentLateSubmissionField';
import AssignmentLatePolicyForm from './AssignmentLatePolicyForm';
import DeliveryTimingBadge from './DeliveryTimingBadge';
import TpStudentDelivery from './TpStudentDelivery';
import TpTeacherDeliveries from './TpTeacherDeliveries';
import NuevoTpForm from '@/app/docentes/cursos/[id]/tps/nuevo/NuevoTpForm';
import TpManagementActions from '@/app/docentes/cursos/[id]/tps/[tpId]/TpManagementActions';
import { getUploadUrl } from '@/lib/actions';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), policy: vi.fn(), submit: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: mocks.refresh }) }));
vi.mock('@/components/RichTextEditor', () => ({ default: () => <div /> }));
vi.mock('@/lib/actions', () => ({
  createAssignmentForCourse: mocks.create, updateAssignment: mocks.update, deleteAssignment: vi.fn(), updateAssignmentLateSubmissions: mocks.policy,
  createDeliveryWithUrl: mocks.submit, createDeliveryWithFiles: mocks.submit, updateDeliveryWithUrl: mocks.submit, updateDeliveryWithFiles: mocks.submit,
  getStudentDeliveryFileDownloadUrl: vi.fn(), getTeacherDeliveryFileDownloadUrl: vi.fn(), getUploadUrl: vi.fn(), updateDeliveryEvaluation: vi.fn(),
}));
beforeEach(() => { vi.clearAllMocks(); for (const fn of [mocks.create, mocks.update, mocks.policy, mocks.submit]) fn.mockResolvedValue({ success: true, assignmentId: 'tp-1' }); });
afterEach(() => vi.unstubAllGlobals());
const dueDate = '2020-01-01T10:00:00Z';
describe('configurar plazos', () => {
  it('la casilla está desactivada por defecto', () => {
    render(<AssignmentLateSubmissionField />); expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('envía casilla marcada al crear un trabajo', async () => {
    const user = userEvent.setup(); render(<NuevoTpForm courseId="course-1" weeks={[]} />);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Práctico' } });
    await user.click(screen.getByRole('checkbox', { name: /Permitir entregas fuera de término/ }));
    await user.click(screen.getByRole('button', { name: /Crear trabajo práctico/ }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect((mocks.create.mock.calls[0][1] as FormData).get('allowLateSubmissions')).toBe('on');
  });
  it('refleja y permite desmarcar el permiso existente al editar', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><TpManagementActions assignment={{ id: 'tp-1', title: 'Práctico', allowLateSubmissions: true } as Assignment} courseId="course-1" weeks={[]} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: /Editar TP/ }));
    expect(screen.getByRole('checkbox', { name: /Permitir entregas fuera de término/ })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /Permitir entregas fuera de término/ }));
    await user.click(screen.getByRole('button', { name: /Guardar cambios/ }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect((mocks.update.mock.calls[0][1] as FormData).get('allowLateSubmissions')).toBeNull();
  });
  it('el panel administrativo guarda sólo la política y confirma resultado', async () => {
    const user = userEvent.setup(); render(<AssignmentLatePolicyForm assignmentId="tp-1" enabled />);
    await user.click(screen.getByRole('checkbox')); await user.click(screen.getByRole('button', { name: 'Guardar política' }));
    await waitFor(() => expect(mocks.policy).toHaveBeenCalledWith('tp-1', false));
    expect(await screen.findByText('Política guardada.')).toBeInTheDocument();
  });
});
describe('entregar y mostrar tardanza', () => {
  it('bloquea primera entrega vencida sin opción', () => {
    render(<ToastProvider><TpStudentDelivery assignmentId="tp-1" courseId="course-1" delivery={null} dueDate={dueDate} /></ToastProvider>);
    expect(screen.getByText('Entrega cerrada')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Enviar entrega/ })).not.toBeInTheDocument();
  });
  it('habilita primera entrega vencida por URL con advertencia explícita', async () => {
    const user = userEvent.setup(); render(<ToastProvider><TpStudentDelivery assignmentId="tp-1" courseId="course-1" delivery={null} dueDate={dueDate} allowLateSubmissions /></ToastProvider>);
    expect(screen.queryByText('Entrega cerrada')).not.toBeInTheDocument();
    expect(screen.getByText(/Tu envío quedará identificado como fuera de término/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'URL' }));
    await user.type(screen.getByLabelText('URL de la entrega'), 'https://example.com/tp');
    await user.click(screen.getByRole('button', { name: /Enviar entrega/ }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith('tp-1', 'course-1', 'https://example.com/tp'));
  });
  it('no reabre una entrega aprobada aunque permita tardías', () => {
    render(<ToastProvider><TpStudentDelivery assignmentId="tp-1" courseId="course-1" delivery={{ id: 'd1', created: '2026-01-01', repositoryUrl: '', status: 'published', verdict: 'Aprobado' } as Delivery} dueDate={dueDate} allowLateSubmissions /></ToastProvider>);
    expect(screen.queryByRole('button', { name: /Actualizar|Reenviar/ })).not.toBeInTheDocument();
  });
  it('acepta archivos cuando el trabajo vencido tiene permiso', async () => {
    const user = userEvent.setup();
    vi.mocked(getUploadUrl).mockResolvedValue({ success: true, url: 'https://files.example/informe.pdf?firma=fixture', fields: { key: 'informe.pdf' } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    render(<ToastProvider><TpStudentDelivery assignmentId="tp-1" courseId="course-1" delivery={null} dueDate={dueDate} allowLateSubmissions /></ToastProvider>);
    await user.upload(screen.getByLabelText(/Seleccionar archivos/), new File(['informe sintético'], 'informe.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: /Enviar entrega/ }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith('tp-1', 'course-1', [{ name: 'informe.pdf', url: 'https://files.example/informe.pdf' }]));
  });
  it('muestra el formulario al habilitar tardías después de refrescar los datos', () => {
    const { rerender } = render(<ToastProvider><TpStudentDelivery assignmentId="tp-1" courseId="course-1" delivery={null} dueDate={dueDate} /></ToastProvider>);
    expect(screen.queryByRole('button', { name: /Enviar entrega/ })).not.toBeInTheDocument();
    rerender(<ToastProvider><TpStudentDelivery assignmentId="tp-1" courseId="course-1" delivery={null} dueDate={dueDate} allowLateSubmissions /></ToastProvider>);
    expect(screen.getByRole('button', { name: /Enviar entrega/ })).toBeInTheDocument();
  });
  it('conserva etiqueta tras extensión y no marca versión en término', () => {
    const { rerender } = render(<DeliveryTimingBadge delivery={{ submittedAt: '2026-01-02', deadlineSnapshot: { dueDate: '2026-01-01', late: true } }} dueDate="2027-01-01" />);
    expect(screen.getByText('Fuera de término')).toBeInTheDocument();
    rerender(<DeliveryTimingBadge delivery={{ submittedAt: '2026-01-02', deadlineSnapshot: { dueDate: null, late: false } }} dueDate={dueDate} />);
    expect(screen.queryByText('Fuera de término')).not.toBeInTheDocument();
  });
  it('muestra etiqueta de versión vigente y de historial docente por separado', async () => {
    const user = userEvent.setup();
    const delivery = { id: 'd1', student: 's1', assignment: 'tp-1', created: '2026-01-03', submittedAt: '2026-01-03', repositoryUrl: '', status: 'pending', submissionVersion: 2,
      deadlineSnapshot: { dueDate: '2026-01-01', late: true },
      history: [{ version: 1, submittedAt: '2026-01-02', deadlineSnapshot: { dueDate: '2026-01-01', late: true }, repositoryUrl: 'https://example.com/v1' }], expand: { student: { name: 'Estudiante' } },
    } as Delivery;
    render(<ToastProvider><TpTeacherDeliveries deliveries={[delivery]} courseId="course-1" assignmentId="tp-1" dueDate="2027-01-01" /></ToastProvider>);
    expect(screen.getAllByText('Fuera de término')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Estudiante/ }));
    expect(screen.getAllByText('Fuera de término')).toHaveLength(2);
  });
});
