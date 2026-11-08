import type { Position } from './movement';
export const CLASSROOM_SPAWN: Position = { x:240,y:280 };
export const DESKS = [150,210,260].flatMap(y=>[80,310].map(x=>({x,y,w:90,h:22})));
export const nearBoard = (p:Position) => p.x>=180 && p.x<=300 && p.y>=90 && p.y<=130;
export const nearClassExit = (p:Position) => p.x>=222 && p.x<=258 && p.y>=285;
export const atClassExit = (p:Position) => nearClassExit(p) && p.y>=300;
export function canStandInClass(p:Position) {
  if(p.x<28 || p.x>452 || p.y<103 || p.y>305) return false;
  if(p.y>292 && (p.x<222 || p.x>258)) return false;
  for(const desk of DESKS) {
    if(p.x>desk.x-6 && p.x<desk.x+desk.w+6 && p.y>desk.y-3 && p.y<desk.y+desk.h+15) return false;
  }
  return !(p.x>64 && p.x<151 && p.y<135);
}
