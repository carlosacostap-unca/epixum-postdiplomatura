import { describe, expect, it } from 'vitest';
import { atClassExit, canStandInClass, CLASSROOM_SPAWN, DESKS, nearBoard } from './classroom';
import { emptyWalkInput, walk } from './movement';
describe('aula transitable',()=>{
  it('permite llegar a la pizarra por el pasillo central',()=>{
    let p={...CLASSROOM_SPAWN};
    for(let n=0;n<100;n++) p=walk(p,{...emptyWalkInput(),up:true},30,canStandInClass);
    expect(nearBoard(p)).toBe(true); expect(p.y).toBeGreaterThanOrEqual(103);
  });
  it.each(DESKS)('bloquea escritorio y silla en $x,$y',desk=>{
    expect(canStandInClass({x:desk.x+20,y:desk.y+10})).toBe(false);
    expect(canStandInClass({x:desk.x+20,y:desk.y+27})).toBe(false);
  });
  it('la salida solo se cruza por la puerta y no desde el punto inicial',()=>{
    expect(atClassExit(CLASSROOM_SPAWN)).toBe(false);
    expect(canStandInClass({x:100,y:300})).toBe(false);
    expect(canStandInClass({x:240,y:302})).toBe(true);
    expect(atClassExit({x:240,y:302})).toBe(true);
    expect(nearBoard(CLASSROOM_SPAWN)).toBe(false);
  });
});
