import type { Position } from './movement';
export const INTERIOR_SPAWN: Position = {x:240,y:270};
export const ROOMS_PER_WING = 8;
export type NodoAccess = 'front' | 'rear';
export const INTERIOR_REAR_SPAWN: Position = {x:240,y:60};
export const INTERIOR_FRONT_SPAWN = INTERIOR_SPAWN;
export const REAR_EXIT: Position = {x:240,y:52};
export const INTRODUCTION_DOOR = {x:175,y:280};
// Paired classrooms, progressing away from the main entrance.
export const roomDoor = (index:number) => ({x:index%2===0?196:284,y:230-Math.floor(index/2)*48});
export const roomTarget = (index:number) => {const p=roomDoor(index);return {x:p.x+(index%2===0?-5:5),y:p.y};};
export const roomApproach = (index:number) => {const p=roomDoor(index);return {x:p.x+(index%2===0?18:-18),y:p.y};};
export const exitSide = (p:Position):NodoAccess => p.y<155?'rear':'front';
export const nearExit = (p:Position) => p.x>=228&&p.x<=252&&(p.y>=290||p.y<=60);
export const atExit = (p:Position) => nearExit(p)&&(p.y>=300||p.y<=54);
export function nearbyRoom(p:Position,count:number) {
 for(let i=0;i<Math.min(count,8);i++){const d=roomDoor(i);if(Math.abs(p.x-d.x)<=24&&Math.abs(p.y-d.y)<=12)return i;}
 return null;
}
export function enteredRoom(p:Position,count:number,openRooms?:boolean[]) {
 if(Math.hypot(p.x-INTRODUCTION_DOOR.x,p.y-INTRODUCTION_DOOR.y)<=5)return -1;
 const room=nearbyRoom(p,count);
 return room!==null&&(!openRooms||openRooms[room])&&(room%2===0?p.x<=192:p.x>=288)?room:null;
}
export function canStandInside(p:Position,count:number,openRooms?:boolean[]) {
 if(p.y<50||p.y>305)return false;
 if(p.y>=254&&p.y<=290&&p.x>=150&&p.x<=330)return true;
 if(p.x>=202&&p.x<=278)return true;
 for(let i=0;i<Math.min(count,8);i++){
  if(openRooms&&!openRooms[i])continue;
  const d=roomDoor(i);
  if(Math.abs(p.y-d.y)<=10&&Math.abs(p.x-d.x)<=16)return true;
 }
 return false;
}
