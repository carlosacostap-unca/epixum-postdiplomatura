import { WORLD_WIDTH, WORLD_HEIGHT } from './neighborhood';
import type { Position } from './movement';

type Allowed = (p: Position) => boolean;
const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
export function clearSegment(a: Position, b: Position, allowed: Allowed) {
  const steps = Math.max(1, Math.ceil(distance(a, b) * 4));
  for (let i = 0; i <= steps; i++) {
    const p = { x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps };
    if (!allowed(p)) return false;
    // Keep smoothed diagonals clear of corners between samples as well.
    if (i > 0 && i < steps && ![[-.25,-.25],[-.25,.25],[.25,-.25],[.25,.25]].every(([dx,dy])=>allowed({x:p.x+dx,y:p.y+dy}))) return false;
  }
  return true;
}

/** Four-pixel navigation mesh; every edge is checked against the same footprint as walking. */
export function findWalkPath(start: Position, target: Position, allowed: Allowed): Position[] {
  if (!allowed(target)) return [];
  if (clearSegment(start, target, allowed)) return [target];
  const width = WORLD_WIDTH / 4 + 1, height = WORLD_HEIGHT / 4 + 1;
  const point = (id: number) => ({ x: id % width * 4, y: Math.floor(id / width) * 4 });
  const parents = new Int32Array(width * height).fill(-2);
  const costs = new Float64Array(width * height).fill(Infinity);
  const queue: {id:number;score:number;cost:number}[] = [];
  const push=(id:number,cost:number)=>{
    const item={id,cost,score:cost+distance(point(id),target)};
    queue.push(item);let i=queue.length-1;
    while(i>0){const parent=(i-1)>>1;if(queue[parent].score<=item.score)break;queue[i]=queue[parent];i=parent;}queue[i]=item;
  };
  const pop=()=>{
    const first=queue[0],last=queue.pop()!;
    if(queue.length){let i=0;while(i*2+1<queue.length){let child=i*2+1;if(child+1<queue.length&&queue[child+1].score<queue[child].score)child++;if(queue[child].score>=last.score)break;queue[i]=queue[child];i=child;}queue[i]=last;}
    return first;
  };
  for (let y = Math.max(0, Math.floor(start.y / 4) - 1); y <= Math.min(height - 1, Math.ceil(start.y / 4) + 1); y++) {
    for (let x = Math.max(0, Math.floor(start.x / 4) - 1); x <= Math.min(width - 1, Math.ceil(start.x / 4) + 1); x++) {
      const id = y * width + x;
      if (clearSegment(start, point(id), allowed)) { parents[id] = -1; costs[id]=distance(start,point(id));push(id,costs[id]); }
    }
  }
  let end = -1;
  while (queue.length) {
    const current=pop(), id=current.id, p=point(id);
    if(current.cost!==costs[id])continue;
    if (distance(p, target) <= 6 && clearSegment(p, target, allowed)) { end = id; break; }
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x = id % width + dx, y = Math.floor(id / width) + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const next = y * width + x;
      const cost=costs[id]+4;
      if (cost>=costs[next] || !clearSegment(p, point(next), allowed)) continue;
      parents[next] = id; costs[next]=cost;push(next,cost);
    }
  }
  if (end < 0) return [];
  const path: Position[] = [target];
  for (let id = end; id !== -1; id = parents[id]) path.push(point(id));
  path.reverse();
  // Remove grid stair-steps wherever the character has a clear line of travel.
  const smooth: Position[] = [];
  let from = start;
  for (let i = 0; i < path.length;) {
    let last = i;
    for (let j = i + 1; j < path.length && clearSegment(from, path[j], allowed); j++) last = j;
    from = path[last]; smooth.push(from); i = last + 1;
  }
  return smooth;
}

export function followWalkPath(start: Position, path: Position[], delta: number, allowed: Allowed): Position {
  let remaining = 60 * Math.min(Math.max(delta, 0), 50) / 1000;
  let p = start;
  while (path.length && remaining > 0) {
    const target = path[0], length = distance(p, target);
    if (length < .001) { path.shift(); continue; }
    const step = Math.min(remaining, length);
    const next = step === length ? { ...target } : { x: p.x + (target.x - p.x) * step / length, y: p.y + (target.y - p.y) * step / length };
    if (!clearSegment(p, next, allowed)) { path.length = 0; break; }
    p = next; remaining -= step;
    if (step === length) { path.shift(); break; }
  }
  return p;
}
