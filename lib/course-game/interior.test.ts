import { describe, expect, it } from 'vitest';
import { atExit, canStandInside, enteredRoom, nearbyRoom, roomDoor, INTERIOR_REAR_SPAWN, REAR_EXIT, INTRODUCTION_DOOR, exitSide } from './interior';
import {findWalkPath} from './navigation';
import { emptyWalkInput, walk } from './movement';
describe('interior transitable', () => {
  it('conecta la entrada norte con ambas salidas y mantiene Aula 0 separada',()=>{
    expect(atExit(INTERIOR_REAR_SPAWN)).toBe(false);
    expect(enteredRoom(INTERIOR_REAR_SPAWN,8)).toBeNull();
    for(const target of [REAR_EXIT,{x:240,y:302},INTRODUCTION_DOOR]) {
      expect(findWalkPath(INTERIOR_REAR_SPAWN,target,p=>canStandInside(p,8)).length).toBeGreaterThan(0);
    }
    expect(atExit(REAR_EXIT)).toBe(true);expect(exitSide(REAR_EXIT)).toBe('rear');
    expect(enteredRoom(REAR_EXIT,8)).toBeNull();
    expect(enteredRoom(INTRODUCTION_DOOR,8)).toBe(-1);
  });
  it.each([0,1,2,3,4,5,6,7])('abre el aula %i al cruzar su umbral', index => {
    const door=roomDoor(index);
    let p={x:door.x,y:index<4?180:185};
    for(let n=0;n<40 && enteredRoom(p,8)===null;n++) p=walk(p,{...emptyWalkInput(),up:index<4,down:index>=4},30,q=>canStandInside(q,8));
    expect(enteredRoom(p,8)).toBe(index);
  });
  it('bloquea paredes y aulas que no corresponden a clases publicadas', () => {
    expect(canStandInside({x:95,y:150},8)).toBe(false);
    expect(canStandInside({x:420,y:150},3)).toBe(false);
    expect(nearbyRoom({x:420,y:150},3)).toBeNull();
    expect(canStandInside({x:60,y:150},3)).toBe(true);
  });
  it('permite recorrer la salida y evita activarla desde el pasillo', () => {
    expect(atExit({x:240,y:190})).toBe(false);
    let p={x:240,y:190};
    for(let n=0;n<80;n++) p=walk(p,{...emptyWalkInput(),down:true},30,q=>canStandInside(q,8));
    expect(atExit(p)).toBe(true);
  });
});
