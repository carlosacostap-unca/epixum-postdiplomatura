import type PocketBase from 'pocketbase';
import { describe, expect, it, vi } from 'vitest';
import { processPendingPracticalWork } from './practical-work-scheduler';
import { automaticallyPreevaluateDelivery } from './ai-preevaluation-service';

vi.mock('./ai-preevaluation-service', () => ({ automaticallyPreevaluateDelivery: vi.fn() }));

describe('detección automática de trabajos pendientes', () => {
  it('continúa desde el cursor y omite formatos incompatibles sin bloquear el recorrido', async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: String(i), repositoryUrl: i === 24 ? JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp' }) : '',
    }));
    const getList = vi.fn().mockResolvedValueOnce({ items }).mockResolvedValueOnce({ items: [] });
    const filter = vi.fn().mockReturnValue('pending-filter');
    const pb = { filter, collection: () => ({ getList }) } as unknown as PocketBase;
    vi.mocked(automaticallyPreevaluateDelivery).mockResolvedValue({ success: false, error: 'Reintento diferido.' });
    expect(await processPendingPracticalWork(pb, '')).toBe('24');
    expect(automaticallyPreevaluateDelivery).toHaveBeenCalledTimes(1);
    expect(automaticallyPreevaluateDelivery).toHaveBeenCalledWith(pb, '24');
    expect(await processPendingPracticalWork(pb, '24')).toBe('');
    expect(filter).toHaveBeenLastCalledWith(expect.stringContaining('status != "published"'), { afterId: '24' });
    expect(filter.mock.calls[0][0]).toContain('aiPreevaluationEnabled = true');
    expect(filter.mock.calls[0][0]).toContain('assignment_ai_configs_via_assignment.active ?= true');
  });
});
