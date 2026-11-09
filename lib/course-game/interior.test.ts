import { describe, expect, it } from 'vitest';
import { atExit, canStandInside, enteredRoom, nearbyRoom, roomDoor, roomApproach, roomTarget, INTERIOR_FRONT_SPAWN, INTERIOR_REAR_SPAWN, REAR_EXIT, INTRODUCTION_DOOR, exitSide } from './interior';
import {findWalkPath} from './navigation';
import { emptyWalkInput, walk } from './movement';
describe('interior transitable', () => {
  it('ordena todas las aulas a la izquierda y conecta las dos entradas con todas las aulas',()=>{
    for(let i=0;i<8;i++){
      const door=roomDoor(i);expect(door.x<220).toBe(true);
      if(i>0)expect(door.y).toBeLessThan(roomDoor(i-1).y);
      if(i>=2)expect(door.y).toBeLessThan(roomDoor(i-2).y);
      for(const start of [INTERIOR_FRONT_SPAWN,INTERIOR_REAR_SPAWN])expect(findWalkPath(start,roomTarget(i),p=>canStandInside(p,8)).length).toBeGreaterThan(0);
    }
    expect(canStandInside(roomTarget(1),8,[true,false])).toBe(false);
  });
  it('conecta la entrada norte con ambas salidas y mantiene Aula 0 separada',()=>{
    expect(atExit(INTERIOR_REAR_SPAWN)).toBe(false);
    expect(enteredRoom(INTERIOR_REAR_SPAWN,8)).toBeNull();
    for(const target of [REAR_EXIT,{x:220,y:946},INTRODUCTION_DOOR]) {
      expect(findWalkPath(INTERIOR_REAR_SPAWN,target,p=>canStandInside(p,8)).length).toBeGreaterThan(0);
    }
    expect(atExit(REAR_EXIT)).toBe(true);expect(exitSide(REAR_EXIT)).toBe('rear');
    expect(enteredRoom(REAR_EXIT,8)).toBeNull();
    expect(enteredRoom(INTRODUCTION_DOOR,8)).toBe(-1);
  });
  it.each([0,1,2,3,4,5,6,7])('abre el aula %i al cruzar su umbral', index => {

    let p=roomApproach(index);
    for(let n=0;n<40 && enteredRoom(p,8)===null;n++) p=walk(p,{...emptyWalkInput(),left:true,right:false},30,q=>canStandInside(q,8));
    expect(enteredRoom(p,8)).toBe(index);
  });
  it('bloquea paredes y aulas que no corresponden a clases publicadas', () => {
    expect(canStandInside({x:176,y:850},8)).toBe(false);
    expect(canStandInside(roomTarget(7),3)).toBe(false);
    expect(nearbyRoom(roomTarget(7),3)).toBeNull();
    expect(canStandInside(roomTarget(0),3)).toBe(true);
  });
  it('permite recorrer la salida y evita activarla desde el pasillo', () => {
    expect(atExit({x:220,y:900})).toBe(false);
    let p={x:220,y:900};
    for(let n=0;n<80;n++) p=walk(p,{...emptyWalkInput(),down:true},30,q=>canStandInside(q,8));
    expect(atExit(p)).toBe(true);
  });
});
