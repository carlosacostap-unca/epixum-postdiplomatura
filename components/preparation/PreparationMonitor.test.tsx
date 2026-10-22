import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PreparationMonitor } from './PreparationMonitor';

const refresh = vi.hoisted(() => vi.fn());
const router = { refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it('actualiza el seguimiento visible cada 15 segundos y permite actualizarlo manualmente', () => {
  vi.useFakeTimers();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  render(<PreparationMonitor />);
  act(() => vi.advanceTimersByTime(15000)); expect(refresh).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar seguimiento' }));
  expect(refresh).toHaveBeenCalledTimes(2);
});

it('evita actualizaciones automáticas si la página está oculta', () => {
  vi.useFakeTimers(); vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  render(<PreparationMonitor />);
  act(() => vi.advanceTimersByTime(30000)); expect(refresh).not.toHaveBeenCalled();
});
