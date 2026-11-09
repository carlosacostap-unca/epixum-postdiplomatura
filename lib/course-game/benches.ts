import { CLASSROOM_SEATS, TEACHER_SEAT } from './classroom';
import { BENCHES, NODO_BENCHES } from './neighborhood';
import type { Position } from './movement';

export const GAME_BENCHES = [
  ...BENCHES.map(([x,y],i)=>({id:`plaza-${i}`,x,y:y-3,w:17,h:10})),
  ...NODO_BENCHES.map((bench,i)=>({...bench,id:`nodo-${i}`})),
].map(bench=>({...bench,approach:{x:bench.x+bench.w/2,y:bench.y+bench.h+8},seat:{x:bench.x+bench.w/2,y:bench.y+9}}));
export type GameBench = typeof GAME_BENCHES[number];
export type WalkDestination = Position & { benchId?: string; notebook?: boolean; workshopNpc?: import("./workshop").WorkshopPerson };
export function reachedBench(position:Position,destination:WalkDestination|null,classroom=false,canPresent=false) {
  const bench=(classroom ? [...CLASSROOM_SEATS,...(canPresent?[TEACHER_SEAT]:[])] : GAME_BENCHES).find(item=>item.id===destination?.benchId);
  return bench && Math.hypot(position.x-bench.approach.x,position.y-bench.approach.y)<1 ? bench : null;
}
