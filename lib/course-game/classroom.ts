import type { Position } from './movement';
export const CLASSROOM_WIDTH=320, CLASSROOM_HEIGHT=520;
export const CLASSROOM_SPAWN: Position = {x:260,y:160};
export const DESKS = [190,280,370].flatMap(y=>[36,194].map(x=>({x,y,w:90,h:22})));
export const nearBoard = (p:Position) => p.x>=125 && p.x<=195 && p.y>=90 && p.y<=130;
export const nearClassExit = (p:Position) => p.x>=278 && p.y>=144 && p.y<=176;
export const atClassExit = (p:Position) => nearClassExit(p) && p.x>=302;
export function canStandInClass(p:Position) {
  if(p.x>=278 && p.x<=308 && p.y>=144 && p.y<=176) return true;
  if(p.x<28 || p.x>292 || p.y<103 || p.y>490) return false;

  for(const desk of DESKS) {
    if(p.x>desk.x-6 && p.x<desk.x+desk.w+6 && p.y>desk.y-3 && p.y<desk.y+desk.h+15) return false;
  }
  return !(p.x>34 && p.x<125 && p.y>127 && p.y<161);
}

// Each workstation shares its coordinates with the rendered chair and notebook.
export const CLASSROOM_SEATS = DESKS.flatMap((desk,row)=>[15,58].map((dx,column)=>({
  id:`class-chair-${row}-${column}`,x:desk.x+dx,y:desk.y+21,w:18,h:16,
  approach:{x:desk.x+dx+9,y:desk.y+39},
  seat:{x:desk.x+dx+9,y:desk.y+37},
  notebook:{x:desk.x+dx-3,y:desk.y-1,w:24,h:17},
})));

export const TEACHER_SEAT={id:'teacher-desk',x:70,y:105,w:18,h:16,approach:{x:132,y:118},seat:{x:79,y:125},notebook:{x:78,y:129,w:20,h:14}};
