import type { Position } from './movement';
export const CLASSROOM_WIDTH=320, CLASSROOM_HEIGHT=520;
export const CLASSROOM_SPAWN: Position = {x:260,y:400};
export const DESKS = [125,215,305].flatMap(y=>[36,194].map(x=>({x,y,w:90,h:22})));
export const nearBoard = (p:Position) => p.x>=125 && p.x<=195 && p.y>=420 && p.y<=456;
export const nearClassExit = (p:Position) => p.x>=278 && p.y>=384 && p.y<=416;
export const atClassExit = (p:Position) => nearClassExit(p) && p.x>=302;
export function canStandInClass(p:Position) {
  if(p.x>=278 && p.x<=308 && p.y>=384 && p.y<=416) return true;
  if(p.x<28 || p.x>292 || p.y<54 || p.y>456) return false;

  for(const desk of DESKS) {
    if(p.x>desk.x-6 && p.x<desk.x+desk.w+6 && p.y>desk.y-27 && p.y<desk.y+desk.h+6) return false;
  }
  return !(p.x>34 && p.x<125 && p.y>409 && p.y<439);
}

// Each workstation shares its coordinates with the rendered chair and notebook.
export const CLASSROOM_SEATS = DESKS.flatMap((desk,row)=>[15,58].map((dx,column)=>({
  id:`class-chair-${row}-${column}`,x:desk.x+dx,y:desk.y-25,w:18,h:16,
  approach:{x:desk.x+dx+9,y:desk.y-31},
  seat:{x:desk.x+dx+9,y:desk.y-8},
  notebook:{x:desk.x+dx-3,y:desk.y+3,w:24,h:17},
})));

export const TEACHER_SEAT={id:'teacher-desk',x:70,y:438,w:18,h:16,approach:{x:132,y:448},seat:{x:79,y:454},notebook:{x:78,y:409,w:20,h:14}};
