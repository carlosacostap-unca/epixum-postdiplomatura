import { describe, expect, it } from 'vitest';
import { canStand, emptyWalkInput, insideNodo, SPAWN, walk } from './movement';
describe('caminar por el Nodo', () => {
  it('normaliza diagonales y limita saltos por frames detenidos', () => {
    const input = emptyWalkInput();
    const a = walk(SPAWN, { ...input, up: true }, 50);
    const b = walk(SPAWN, { ...input, up: true, right: true }, 50);
    expect(Math.hypot(a.x-SPAWN.x,a.y-SPAWN.y)).toBeCloseTo(Math.hypot(b.x-SPAWN.x,b.y-SPAWN.y));
    expect(walk(SPAWN, {...input,up:true},10000)).toEqual(a);
  });
  it('la fachada bloquea y el acceso central permite entrar', () => {
    let p = { ...SPAWN };
    for (let i=0;i<40 && !insideNodo(p);i++) p=walk(p,{...emptyWalkInput(),up:true},30);
    expect(insideNodo(p)).toBe(true);
    let wall = {x:420,y:685};
    for(let i=0;i<40;i++) wall=walk(wall,{...emptyWalkInput(),up:true},30);
    expect(wall.y).toBeGreaterThanOrEqual(671);
  });
  it('no atraviesa viviendas, canteros o bordes, pero sí las calles', () => {
    expect(canStand({x:265,y:685})).toBe(false);
    expect(canStand({x:305,y:460})).toBe(true);
    expect(canStand({x:520,y:510})).toBe(false);
    expect(canStand({x:0,y:250})).toBe(false);
  });
});
