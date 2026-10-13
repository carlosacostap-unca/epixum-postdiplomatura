import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Link } from '@/types';
import LinkForm from './LinkForm';
import NewResourceForm from '@/app/docentes/cursos/[id]/clases/[classId]/recursos/nuevo/NewResourceForm';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), upload: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/actions', () => ({ createLink: mocks.create, updateLink: mocks.update, getResourceUploadUrl: mocks.upload }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }) }));
beforeEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.create.mockResolvedValue({ success: true }); mocks.update.mockResolvedValue({ success: true }); });
afterEach(() => vi.unstubAllGlobals());

it('envía borrador por defecto al crear un recurso de clase', async () => {
  render(<LinkForm classId="class-1" />);
  expect(screen.getByLabelText('Estado de publicación')).toHaveValue('draft');
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Guía' } });
  fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://example.com' } });
  await userEvent.click(screen.getByRole('button', { name: 'Crear recurso' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalled());
  expect(mocks.create.mock.calls[0][0].get('publicationStatus')).toBe('draft');
  expect(mocks.create.mock.calls[0][0].get('audience')).toBe('everyone');
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
  expect(screen.queryByLabelText('Disponible para')).not.toBeInTheDocument();
});

it.each(['class', 'assignment'] as const)('crea recursos publicados solo para docentes de %s', async parent => {
  render(<LinkForm {...(parent === 'class' ? { classId: 'class-1' } : { assignmentId: 'tp-1' })} />);
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Guía docente' } });
  fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://example.com' } });
  await userEvent.selectOptions(screen.getByLabelText('Estado de publicación'), 'published');
  await userEvent.selectOptions(screen.getByLabelText('Disponible para'), 'teachers');
  await userEvent.click(screen.getByRole('button', { name: 'Crear recurso' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalled());
  const sent = mocks.create.mock.calls[0][0] as FormData;
  expect(sent.get('publicationStatus')).toBe('published');
  expect(sent.get('audience')).toBe('teachers');
});

it('restaura el acceso solo docente y permite compartir un recurso existente', async () => {
  render(<LinkForm classId="class-1" link={{ id: 'link-1', title: 'Guía', url: 'https://example.com', type: 'link', audience: 'teachers' } as Link} />);
  expect(screen.getByLabelText('Disponible para')).toHaveValue('teachers');
  await userEvent.selectOptions(screen.getByLabelText('Disponible para'), 'everyone');
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar recurso' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalled());
  expect(mocks.update.mock.calls[0][1].get('audience')).toBe('everyone');
});

it('envía la audiencia desde el formulario de alta de recursos de una clase', async () => {
  const { container } = render(<NewResourceForm courseId="course-1" classId="class-1" />);
  fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Guía docente' } });
  fireEvent.change(screen.getByLabelText(/URL/), { target: { value: 'https://example.com' } });
  await userEvent.selectOptions(screen.getByLabelText('Disponible para'), 'teachers');
  await userEvent.click(container.querySelector('button[type="submit"]')!);
  await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  expect(mocks.create.mock.calls[0][0].get('audience')).toBe('teachers');
});

it('conserva la audiencia al subir un archivo para docentes', async () => {
  render(<LinkForm assignmentId="tp-1" />);
  mocks.upload.mockResolvedValue({ success: true, url: 'https://upload.example/guia.pdf?signature=x' });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
  await userEvent.click(screen.getByLabelText('Archivo'));
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Solucionario' } });
  await userEvent.upload(document.querySelector('input[type="file"]')!, new File(['guía'], 'guia.pdf', { type: 'application/pdf' }));
  await userEvent.selectOptions(screen.getByLabelText('Disponible para'), 'teachers');
  // jsdom doesn't include userEvent's FileList in native required-file validation.
  fireEvent.submit(screen.getByRole('button', { name: 'Crear recurso' }).closest('form')!);
  await waitFor(() => expect(mocks.create).toHaveBeenCalled());
  expect(mocks.create.mock.calls[0][0].get('type')).toBe('file');
  expect(mocks.create.mock.calls[0][0].get('audience')).toBe('teachers');
});
