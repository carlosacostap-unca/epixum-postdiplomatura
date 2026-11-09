import type { Position } from './movement';
export const INTERIOR_WIDTH=320, INTERIOR_HEIGHT=960;
export const INTERIOR_SPAWN: Position = {x:220,y:900};
export const ROOMS_PER_WING = 8;
export type NodoAccess = 'front' | 'rear';
export const INTERIOR_REAR_SPAWN: Position = {x:220,y:60};
export const INTERIOR_FRONT_SPAWN = INTERIOR_SPAWN;
export const REAR_EXIT: Position = {x:220,y:52};
export const INTRODUCTION_DOOR = {x:150,y:900};
// Left-side classrooms, progressing away from the main entrance.
export const roomDoor = (index:number) => ({x:176,y:800-index*100});
export const roomTarget = (index:number) => {const p=roomDoor(index);return {x:p.x+-5,y:p.y};};
export const roomApproach = (index:number) => {const p=roomDoor(index);return {x:p.x+18,y:p.y};};
export const exitSide = (p:Position):NodoAccess => p.y<480?'rear':'front';
export const nearExit = (p:Position) => p.x>=208&&p.x<=232&&(p.y>=930||p.y<=60);
export const atExit = (p:Position) => nearExit(p)&&(p.y>=944||p.y<=54);
export function nearbyRoom(p:Position,count:number) {
 for(let i=0;i<Math.min(count,8);i++){const d=roomDoor(i);if(Math.abs(p.x-d.x)<=24&&Math.abs(p.y-d.y)<=12)return i;}
 return null;
}
export function enteredRoom(p:Position,count:number,openRooms?:boolean[]) {
 if(Math.hypot(p.x-INTRODUCTION_DOOR.x,p.y-INTRODUCTION_DOOR.y)<=5)return -1;
 const room=nearbyRoom(p,count);
 return room!==null&&(!openRooms||openRooms[room])&&p.x<=172?room:null;
}
export function canStandInside(p:Position,count:number,openRooms?:boolean[]) {
 if(p.y<50||p.y>950)return false;
 if(p.y>=870&&p.y<=930&&p.x>=120&&p.x<=270)return true;
 if(p.x>=182&&p.x<=270)return true;
 for(let i=0;i<Math.min(count,8);i++){
  if(openRooms&&!openRooms[i])continue;
  const d=roomDoor(i);
  if(Math.abs(p.y-d.y)<=10&&Math.abs(p.x-d.x)<=16)return true;
 }
 return false;
}
