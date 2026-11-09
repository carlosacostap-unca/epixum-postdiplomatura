import type { Position } from './movement';
export const INTERIOR_SPAWN: Position = { x: 240, y: 190 };
export const ROOMS_PER_WING = 8;
export type NodoAccess = 'front' | 'rear';
export const INTERIOR_REAR_SPAWN: Position = {x:240,y:106};
export const INTERIOR_FRONT_SPAWN: Position = {x:240,y:270};
export const REAR_EXIT: Position = {x:240,y:52};
export const INTRODUCTION_DOOR = {x:212,y:190};
export const roomDoor = (index: number) => ({ x: 60 + index % 4 * 120, y: index < 4 ? 150 : 210 });
export const exitSide = (p:Position):NodoAccess => p.y<155 ? 'rear' : 'front';
export const nearExit = (p: Position) => p.x >= 228 && p.x <= 252 && (p.y >= 280 || p.y<=76);
export const atExit = (p: Position) => nearExit(p) && (p.y >= 300 || p.y<=54);
export function nearbyRoom(p: Position, count: number) {
  for (let i=0;i<Math.min(count,ROOMS_PER_WING);i++) {
    const door = roomDoor(i);
    if (Math.abs(p.x-door.x)<=13 && Math.abs(p.y-door.y)<=20) return i;
  }
  return null;
}
export function enteredRoom(p: Position, count: number, openRooms?: boolean[]) {
  if(p.x>=208 && p.x<=216 && p.y>=185 && p.y<=195) return -1;
  const room = nearbyRoom(p,count);
  return room !== null && (!openRooms || openRooms[room]) && (room < 4 ? p.y <= 147 : p.y >= 213) ? room : null;
}
export function canStandInside(p: Position, count: number, openRooms?: boolean[]) {
  if (p.x < 12 || p.x > 468 || p.y < 50 || p.y > 305) return false;
  if(p.x>=194 && p.x<=228 && p.y>=160 && p.y<=183) return false;
  if (p.y >= 155 && p.y <= 205) return true;
  if (p.x >= 228 && p.x <= 252 && p.y >= 50 && p.y <= 155) return true;
  if (p.x >= 228 && p.x <= 252 && p.y >= 200) return true;
  for (let i=0;i<Math.min(count,ROOMS_PER_WING);i++) {
    if (openRooms && !openRooms[i]) continue;
    const door=roomDoor(i);
    if (Math.abs(p.x-door.x)<=12 && p.y >= door.y-16 && p.y <= door.y+16) return true;
    if (Math.abs(p.x-door.x)<=39 && (i<4 ? p.y>=82 && p.y<138 : p.y>222 && p.y<=280)) return true;
  }
  return false;
}
