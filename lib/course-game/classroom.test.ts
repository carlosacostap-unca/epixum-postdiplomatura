import { describe, expect, it } from 'vitest';
import { atClassExit, canStandInClass, CLASSROOM_SPAWN, DESKS, nearBoard } from './classroom';
import { emptyWalkInput, walk } from './movement';
describe('aula transitable',()=>{
  it('permite llegar a la pizarra por el pasillo central',()=>{
    let p={x:160,y:470};
    for(let n=0;n<250;n++) p=walk(p,{...emptyWalkInput(),up:true},30,canStandInClass);
    expect(nearBoard(p)).toBe(true); expect(p.y).toBeGreaterThanOrEqual(103);
  });
  it.each(DESKS)('bloquea escritorio y silla en $x,$y',desk=>{
    expect(canStandInClass({x:desk.x+20,y:desk.y+10})).toBe(false);
    expect(canStandInClass({x:desk.x+20,y:desk.y+27})).toBe(false);
  });
  it('la salida solo se cruza por la puerta y no desde el punto inicial',()=>{
    expect(atClassExit(CLASSROOM_SPAWN)).toBe(false);
    expect(canStandInClass({x:100,y:500})).toBe(false);
    expect(canStandInClass({x:304,y:160})).toBe(true);
    expect(atClassExit({x:304,y:160})).toBe(true);
    expect(nearBoard(CLASSROOM_SPAWN)).toBe(false);
  });
});

import { CLASSROOM_SEATS } from './classroom';
import { reachedBench } from './benches';
import { findWalkPath } from './navigation';
it.each(CLASSROOM_SEATS)('llega a la silla $id sin atravesar muebles',seat=>{
  expect(canStandInClass(seat.approach)).toBe(true);
  const path=findWalkPath(CLASSROOM_SPAWN,seat.approach,canStandInClass);
  expect(path.at(-1)).toEqual(seat.approach);
  expect(path.every(canStandInClass)).toBe(true);
  const target={...seat.approach,benchId:seat.id,notebook:true};
  expect(reachedBench(CLASSROOM_SPAWN,target,true)).toBeNull();
  expect(reachedBench(seat.approach,target,true)?.id).toBe(seat.id);
  expect(reachedBench(seat.approach,target)).toBeNull();
});
