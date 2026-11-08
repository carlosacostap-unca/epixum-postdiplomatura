import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhaserVillage from './PhaserVillage';

const mock = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), destroy: vi.fn() }));
vi.mock('./village-loader', () => ({ loadVillageEngine: () => Promise.resolve({ createVillageEngine: mock.create }) }));
const initial = { selected: 0, count: 8, paused: false, restored: false };
beforeEach(() => {
  vi.clearAllMocks();
  mock.create.mockImplementation((_host, _state, ready) => {
    ready();
    return { update: mock.update, destroy: mock.destroy };
  });
});

describe('ciclo de vida Phaser', () => {
  it('monta una sola escena en StrictMode y sincroniza cambios sin recrearla', async () => {
    const view = render(<StrictMode><PhaserVillage {...initial} /></StrictMode>);
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(mock.create).toHaveBeenCalledTimes(1));
    view.rerender(<StrictMode><PhaserVillage {...initial} selected={3} paused /></StrictMode>);
    expect(mock.update).toHaveBeenLastCalledWith({ ...initial, selected: 3, paused: true });
    expect(mock.create).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mock.destroy).toHaveBeenCalledTimes(1);
  });
  it('no crea un motor si el componente sale antes de terminar la importación', async () => {
    const view = render(<PhaserVillage {...initial} />);
    view.unmount();
    await act(async () => { await Promise.resolve(); });
    expect(mock.create).not.toHaveBeenCalled();
  });
  it('informa el fallo sin desmontar el contenedor accesible', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.create.mockImplementation(() => { throw new Error('Renderer unavailable'); });
    render(<PhaserVillage {...initial} />);
    await act(async () => { await Promise.resolve(); });
    expect(await screen.findByRole('status')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('El paisaje no pudo cargarse'));
    log.mockRestore();
  });
});
