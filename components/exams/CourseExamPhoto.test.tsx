import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { CourseExamPhoto } from './CourseExamPhoto';
it('permite ver y ocultar la foto del intento desde el detalle docente', async () => {
  const user = userEvent.setup(); render(<CourseExamPhoto src="/api/parciales/course/intentos/attempt/foto" />);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Ver foto inicial' }));
  expect(screen.getByRole('img').getAttribute('src')).toContain('/api/parciales/course/intentos/attempt/foto');
  fireEvent.error(screen.getByRole('img')); expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar');
  await user.click(screen.getByRole('button', { name: 'Reintentar foto' })); expect(screen.getByRole('img')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Ocultar foto inicial' })); expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it('explica la ausencia de foto en intentos anteriores', () => {
  render(<CourseExamPhoto />); expect(screen.getByText('Este intento comenzó sin una foto inicial registrada.')).toBeVisible(); expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
