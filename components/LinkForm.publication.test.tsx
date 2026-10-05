import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Link } from '@/types';
import LinkForm from './LinkForm';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/actions', () => ({ createLink: mocks.create, updateLink: mocks.update, getResourceUploadUrl: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue({ success: true }); mocks.update.mockResolvedValue({ success: true }); });

it('envía borrador por defecto al crear un recurso de clase', async () => {
  render(<LinkForm classId="class-1" />);
  expect(screen.getByLabelText('Estado de publicación')).toHaveValue('draft');
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Guía' } });
  fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://example.com' } });
  await userEvent.click(screen.getByRole('button', { name: 'Crear recurso' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalled());
  expect(mocks.create.mock.calls[0][0].get('publicationStatus')).toBe('draft');
});

it('abre recursos anteriores como publicados y permite devolverlos a borrador', async () => {
  render(<LinkForm assignmentId="tp-1" link={{ id: 'link-1', title: 'Guía', url: 'https://example.com', type: 'link' } as Link} />);
  expect(screen.getByLabelText('Estado de publicación')).toHaveValue('published');
  await userEvent.selectOptions(screen.getByLabelText('Estado de publicación'), 'draft');
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar recurso' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalled());
  expect(mocks.update.mock.calls[0][1].get('publicationStatus')).toBe('draft');
});

it('mantiene el formulario de contenidos independientes sin estado de publicación', () => {
  render(<LinkForm contentId="content-1" />);
  expect(screen.queryByLabelText('Estado de publicación')).not.toBeInTheDocument();
});
