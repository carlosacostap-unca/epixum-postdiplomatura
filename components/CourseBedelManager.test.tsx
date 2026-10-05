import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CourseBedelManager from './CourseBedelManager';

const mocks = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@/lib/actions-course-bedels', () => ({ addCourseBedel: mocks.add, removeCourseBedel: mocks.remove }));

describe('asignación de bedeles', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.add.mockResolvedValue({ success: true }); mocks.remove.mockResolvedValue({ success: true }); });
  it('explica que la asignación es opcional y envía nombre, apellido y email', async () => {
    const user = userEvent.setup(); render(<CourseBedelManager courseId="course" bedels={[]} />);
    expect(screen.getByText('Este curso no tiene bedeles')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Apellido/), 'Pérez');
    await user.type(screen.getByLabelText(/Nombre/), 'Ana');
    await user.type(screen.getByLabelText(/Email/), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Asignar bedel' }));
    await waitFor(() => expect(mocks.add).toHaveBeenCalledWith('course', { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Bedel asignado');
  });
  it('pide confirmación antes de retirar y conserva los otros cursos', async () => {
    const user = userEvent.setup(); render(<CourseBedelManager courseId="course" bedels={[{ id: 'bedel', course: 'course', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' }]} />);
    await user.click(screen.getByRole('button', { name: 'Retirar a Ana Pérez' }));
    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Retirar bedel' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('course', 'bedel'));
  });
});
