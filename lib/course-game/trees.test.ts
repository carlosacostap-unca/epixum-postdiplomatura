import { expect, it } from 'vitest';
import { TREES, TREE_TRUNKS, PALM_TRUNKS } from './neighborhood';
import { canStand, walk } from './movement';
import { findWalkPath, clearSegment } from './navigation';

it('bloquea las bases de todos los troncos, incluidas las palmeras',()=>{
  for(const b of [...TREE_TRUNKS,...PALM_TRUNKS]) expect(canStand({x:b.x+b.w/2,y:b.y+b.h/2})).toBe(false);
});
it('permite caminar bajo la copa y rodea el tronco al elegir un destino',()=>{
  const [x,y]=TREES[0];
  expect(canStand({x:x-8,y:y-8})).toBe(true);
  expect(canStand({x:x+9,y:y+5})).toBe(true);
  let position={x:x-10,y:y+6};
  for(let i=0;i<20;i++) position=walk(position,{up:false,down:false,left:false,right:true},50);
  expect(position.x).toBeLessThan(x);
  const start={x:x-15,y:y+6},end={x:x+15,y:y+6};
  const route=findWalkPath(start,end,canStand);
  expect(route.length).toBeGreaterThan(0);
  let previous=start;
  for(const point of route) {expect(clearSegment(previous,point,canStand)).toBe(true);previous=point;}
});
