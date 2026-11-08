export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export function classHasStarted(date: string | undefined, now: number): boolean {
  const starts = Date.parse(date || '');
  return Number.isFinite(starts) && Number.isFinite(now) && starts <= now;
}
export function argentinaDateTime(time: number) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: ARGENTINA_TIME_ZONE, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).format(time);
}
export interface GameSchedule { serverNow: number; classes: { id: string; date: string; title?: string }[] }
export type SyncGameSchedule = () => Promise<GameSchedule>;
