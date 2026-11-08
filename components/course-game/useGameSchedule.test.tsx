import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGameSchedule } from './useGameSchedule';
afterEach(()=>vi.useRealTimers());
describe('reloj del servidor',()=>{
  it('ignora el reloj del dispositivo y confirma la apertura con el servidor',async()=>{
    vi.useFakeTimers({toFake:['setInterval','clearInterval','performance','Date']});
    vi.setSystemTime(new Date('2099-01-01'));
    const start=Date.parse('2026-11-10T23:00:00Z');
    const sync=vi.fn().mockResolvedValue({serverNow:start-1000,classes:[{id:'a',date:new Date(start).toISOString()}]});
    const {result,unmount}=renderHook(()=>useGameSchedule(sync));
    await act(async()=>{});
    expect(result.current.clock?.now).toBe(start-1000);
    expect(result.current.isOpen('a')).toBe(false);
    sync.mockRejectedValue(new Error('Offline'));
    await act(async()=>vi.advanceTimersByTimeAsync(2000));
    expect(result.current.isOpen('a')).toBe(false);
    sync.mockResolvedValue({serverNow:start+2000,classes:[{id:'a',date:new Date(start).toISOString()}]});
    await act(async()=>vi.advanceTimersByTimeAsync(1000));
    expect(result.current.isOpen('a')).toBe(true);
    sync.mockRejectedValue(new Error('Offline'));
    await act(async()=>vi.advanceTimersByTimeAsync(46000));
    expect(result.current.clock?.fresh).toBe(false);
    expect(result.current.isOpen('a')).toBe(false);
    unmount();
  });
});
