import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import example from '@/public/interactive-class-example.json';
import { parseInteractiveMaterial } from '@/lib/interactive-material';
import { createSimulation, simulationTeacherState } from '@/lib/interactive-simulation';
import { publicScreen } from '@/lib/live-interactive-contract';
import { LiveRoom } from './LiveRoom';

afterEach(() => { vi.unstubAllGlobals(); });

it('conserva HTTP y SSE en la sala real al reutilizar su presentación', async () => {
  const material = parseInteractiveMaterial(example)!;
  const initial = simulationTeacherState(createSimulation(material, 'Clase real'));
  initial.session = { ...initial.session, id: 'real-session', code: 'ABC12345' };
  let snapshot = initial;
  const close = vi.fn();
  const events = vi.fn(function () { return { close, addEventListener: vi.fn(), onerror: null }; });
  vi.stubGlobal('EventSource', events);
  const fetch = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      const next = material.screens[1];
      snapshot = { ...initial, session: { ...initial.session, screenIndex: 1, screenId: next.id, screenType: next.type, screen: publicScreen(next) } };
    }
    return { ok: true, json: async () => snapshot };
  });
  vi.stubGlobal('fetch', fetch);
  const user = userEvent.setup();
  const { unmount } = render(<LiveRoom initial={initial} />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(events).toHaveBeenCalledWith('/api/interactivas/sesiones/real-session/events');
  expect(screen.getByText('Sesión en vivo')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Siguiente pantalla' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: '¿Qué nos ayuda a comprobar una idea?', level: 2 })).toBeInTheDocument());
  expect(fetch).toHaveBeenCalledWith('/api/interactivas/sesiones/real-session', expect.objectContaining({ method: 'POST', body: JSON.stringify({ kind: 'screen', revision: initial.session.revision, index: 1 }) }));
  expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument();
  unmount();
  expect(close).toHaveBeenCalled();
});
