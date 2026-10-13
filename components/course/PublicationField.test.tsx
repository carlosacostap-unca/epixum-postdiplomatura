import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { PublicationField } from './PublicationField';
import { PublicationBadge } from './PublicationBadge';

it('convierte la fecha local a UTC y elimina la fecha enviada al cancelar la programación', async () => {
  const { container } = render(<form><PublicationField scheduling /></form>);
  await userEvent.selectOptions(screen.getByLabelText('Estado de publicación'), 'scheduled');
  fireEvent.change(screen.getByLabelText('Fecha y hora de publicación'), { target: { value: '2027-01-01T12:30' } });
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('publishAt')).toBe(new Date('2027-01-01T12:30').toISOString());
  await userEvent.selectOptions(screen.getByLabelText('Estado de publicación'), 'draft');
  expect(new FormData(form).get('publicationStatus')).toBe('draft');
  expect(new FormData(form).get('publishAt')).toBeNull();
});

it('mantiene un registro anterior publicado y restaura una programación existente', () => {
  const { unmount } = render(<PublicationField scheduling existing />);
  expect(screen.getByLabelText('Estado de publicación')).toHaveValue('published');
  unmount();
  render(<PublicationField scheduling existing status="scheduled" publishAt="2027-01-01T15:00:00Z" />);
  expect(screen.getByLabelText('Estado de publicación')).toHaveValue('scheduled');
  expect(screen.getByLabelText('Fecha y hora de publicación')).toHaveAttribute('required');
});

it('muestra un programado vencido como publicado y uno futuro con su fecha', () => {
  render(<><PublicationBadge status="scheduled" publishAt="2000-01-01T15:00:00Z" /><PublicationBadge status="scheduled" publishAt="2099-01-01T15:00:00Z" /></>);
  expect(screen.getByText('Publicado')).toBeInTheDocument();
  expect(screen.getByText(/Programado/)).toBeInTheDocument();
  expect(screen.getByText(/2099/)).toBeInTheDocument();
});
