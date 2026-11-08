import { OBSTACLES, NODO_FOOTPRINT, WORLD_WIDTH, WORLD_HEIGHT, NODO_ENTRANCE, NODO_REAR_ENTRANCE } from './neighborhood';
export interface Position { x: number; y: number }
export interface WalkInput { up: boolean; down: boolean; left: boolean; right: boolean }
export const emptyWalkInput = (): WalkInput => ({ up: false, down: false, left: false, right: false });
export const SPAWN: Position = { x: NODO_ENTRANCE.x, y: NODO_ENTRANCE.y+40 };
export const nodoAccessSide = (p:Position) => p.y<NODO_FOOTPRINT.y ? 'rear' as const : 'front' as const;
const nearFront = (p: Position) => Math.abs(p.x-NODO_ENTRANCE.x)<=15 && p.y>=NODO_ENTRANCE.y-6 && p.y<=NODO_ENTRANCE.y+25;
const nearRear = (p: Position) => Math.abs(p.x-NODO_REAR_ENTRANCE.x)<=22 && p.y>=NODO_REAR_ENTRANCE.y-25 && p.y<=NODO_REAR_ENTRANCE.y+10;
export const nearNodo = (p: Position) => nearFront(p) || nearRear(p);
export const insideNodo = (p: Position) => (nearFront(p) && p.y<=NODO_ENTRANCE.y+1) || (nearRear(p) && p.y>=NODO_REAR_ENTRANCE.y-1);
// Local collision buckets keep walking and long routes independent of the parcel count.
const buckets = new Map<string, typeof OBSTACLES>();
for(const b of OBSTACLES) for(let x=Math.floor((b.x-4)/64);x<=Math.floor((b.x+b.w+4)/64);x++) for(let y=Math.floor(b.y/64);y<=Math.floor((b.y+b.h)/64);y++) {
  const key=`${x},${y}`; const items=buckets.get(key) ?? []; items.push(b); buckets.set(key,items);
}
export function canStand(p: Position) {
  if(p.x<9 || p.x>WORLD_WIDTH-9 || p.y<35 || p.y>WORLD_HEIGHT-8) return false;
  const b=NODO_FOOTPRINT;
  const frontPassage=Math.abs(p.x-NODO_ENTRANCE.x)<=11 && p.y>=NODO_ENTRANCE.y-10;
  if(p.x>b.x && p.x<b.x+b.w && p.y>b.y && p.y<b.y+b.h && !frontPassage) return false;
  for(const {x,y,w,h} of buckets.get(`${Math.floor(p.x/64)},${Math.floor(p.y/64)}`) ?? []) if(p.x>x-4 && p.x<x+w+4 && p.y>y && p.y<y+h) return false;
  return true;
}
export function walk(p: Position, input: WalkInput, deltaMs: number, allowed: (p: Position) => boolean = canStand): Position {
  const dx = Number(input.right) - Number(input.left), dy = Number(input.down) - Number(input.up);
  const length = Math.hypot(dx, dy);
  if (!length) return p;
  // Clamp stalled frames and substep to prevent tunnelling across narrow barriers.
  const distance = 60 * Math.min(Math.max(deltaMs, 0), 50) / 1000;
  const steps = Math.max(1, Math.ceil(distance));
  let next = { ...p };
  for (let i = 0; i < steps; i++) {
    const x = next.x + dx / length * distance / steps;
    if (allowed({ ...next, x })) next = { ...next, x };
    const y = next.y + dy / length * distance / steps;
    if (allowed({ ...next, y })) next = { ...next, y };
  }
  return next;
}
