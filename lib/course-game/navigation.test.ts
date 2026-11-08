import { NODO_ENTRANCE } from './neighborhood';
import { describe, expect, it } from 'vitest';
import { clearSegment, findWalkPath, followWalkPath } from './navigation';
import { canStand, SPAWN, insideNodo } from './movement';
import { canStandInClass, CLASSROOM_SPAWN } from './classroom';
import { canStandInside, INTERIOR_SPAWN, enteredRoom, roomDoor } from './interior';

describe('caminar hacia un destino', () => {
  it('los destinos de los accesos cruzan sus umbrales de entrada automática', () => {
    const nodoPath = findWalkPath(SPAWN,NODO_ENTRANCE,canStand);
    expect(insideNodo(nodoPath.at(-1)!)).toBe(true);
    for (let i=0;i<8;i++) {
      const door = roomDoor(i);
      const path = findWalkPath(INTERIOR_SPAWN,{x:door.x,y:door.y+(i<4?-4:4)},p=>canStandInside(p,8));
      expect(path.length).toBeGreaterThan(0);
      expect(enteredRoom(path.at(-1)!,8)).toBe(i);
      let position = {...INTERIOR_SPAWN};
      for (let frame=0;frame<500 && path.length;frame++) position=followWalkPath(position,path,33,p=>canStandInside(p,8));
      expect(enteredRoom(position,8)).toBe(i);
    }
  });
  it.each([
    ['cantero', {x:547,y:510}, {x:484,y:510}, canStand],
    ['escritorios', CLASSROOM_SPAWN, {x:55,y:120}, canStandInClass],
    ['calle', SPAWN, {x:305,y:200}, canStand],
    ['puerta de aula', INTERIOR_SPAWN, {x:60,y:140}, (p: {x:number;y:number})=>canStandInside(p,8)],
  ] as const)('llega sin atravesar obstáculos: %s', (_name, start, target, allowed) => {
    const path = findWalkPath(start,target,allowed);
    expect(path.length).toBeGreaterThan(0);
    let p = {...start};
    for (let frame=0; frame<1000 && path.length; frame++) {
      const next = followWalkPath(p,path,33,allowed);
      expect(clearSegment(p,next,allowed)).toBe(true);
      expect(Math.hypot(next.x-p.x,next.y-p.y)).toBeLessThanOrEqual(1.981);
      p = next;
    }
    expect(p.x).toBeCloseTo(target.x);
    expect(p.y).toBeCloseTo(target.y);
    expect(path).toHaveLength(0);
  });
  it('rechaza destinos bloqueados o sin conexión', () => {
    expect(findWalkPath(SPAWN,{x:520,y:510},canStand)).toEqual([]);
    expect(findWalkPath({x:10,y:10},{x:100,y:10},p=>p.x<40 || p.x>60)).toEqual([]);
  });
  it('limita frames largos y no sobrepasa un destino cercano', () => {
    const path = [{x:SPAWN.x+1,y:SPAWN.y}];
    expect(followWalkPath(SPAWN,path,10000,canStand)).toEqual({x:SPAWN.x+1,y:SPAWN.y});
    expect(path).toEqual([]);
  });
});
