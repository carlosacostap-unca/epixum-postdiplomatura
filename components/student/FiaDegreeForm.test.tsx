import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { FiaDegreeForm } from './FiaDegreeForm';

vi.mock('@/lib/actions-fia-degree', () => ({ saveFiaDegree: vi.fn() }));

it('recupera ambas carreras y permite cambiar la selección pulsando las tarjetas', () => {
  render(<FiaDegreeForm degree="ambas" />);
  const technical = screen.getByRole('checkbox', { name: 'Tecnicatura Universitaria en Diseño de Software' });
  const engineering = screen.getByRole('checkbox', { name: 'Ingeniería en Informática' });
  const form = screen.getByRole<HTMLFormElement>('form');
  const value = () => new FormData(form).get('degree');
  const save = screen.getByRole('button', { name: 'Guardar selección' });

  expect(technical).toBeChecked();
  expect(engineering).toBeChecked();
  expect(value()).toBe('ambas');
  fireEvent.click(engineering);
  expect(value()).toBe('tecnicatura');
  fireEvent.click(technical);
  expect(save).toBeDisabled();
  fireEvent.click(engineering);
  expect(value()).toBe('ingenieria');
  fireEvent.click(technical);
  expect(value()).toBe('ambas');
  expect(save).toBeEnabled();
});
