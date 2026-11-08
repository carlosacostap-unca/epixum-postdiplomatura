'use client';
import { useEffect, useState } from 'react';
import { classHasStarted, type GameSchedule, type SyncGameSchedule } from '@/lib/course-game/schedule';

export function useGameSchedule(sync?: SyncGameSchedule) {
  const [clock, setClock] = useState<{ now: number; schedule: GameSchedule; fresh: boolean } | null>(null);
  useEffect(() => {
    if (!sync) return;
    let disposed = false, busy = false;
    let snapshot: GameSchedule | null = null, received = 0, attempted = -Infinity;
    const refresh = async () => {
      if (busy || disposed) return;
      busy = true; attempted = performance.now();
      try {
        const data = await sync();
        if (!disposed && Number.isFinite(data.serverNow)) {
          snapshot = data; received = performance.now();
          setClock({ now: data.serverNow, schedule: data, fresh: true });
        }
      } catch { /* Keep the last display; stale clocks never unlock doors. */ }
      finally { busy = false; }
    };
    const tick = () => {
      const monotonic = performance.now();
      if (snapshot) {
        const now = snapshot.serverNow + monotonic - received;
        setClock({ now, schedule: snapshot, fresh: monotonic - received < 45000 });
        const crossed = snapshot.classes.some(c => Date.parse(c.date) > snapshot!.serverNow && Date.parse(c.date) <= now);
        if (crossed && monotonic - attempted >= 1000) void refresh();
      }
      if (monotonic - attempted >= 15000) void refresh();
    };
    const wake = () => { if (document.visibilityState === 'visible') { setClock(previous=>previous ? {...previous,fresh:false} : null); void refresh(); } };
    void refresh();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', wake);
    return () => { disposed = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', wake); };
  }, [sync]);
  const isOpen = (id: string) => Boolean(clock?.fresh && clock.schedule.classes.some(c=>c.id===id && classHasStarted(c.date,clock.schedule.serverNow)));
  return { clock, isOpen };
}
