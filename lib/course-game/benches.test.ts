import { expect, it } from 'vitest';
import { GAME_BENCHES, reachedBench } from './benches';
import { canStand, SPAWN } from './movement';
import { findWalkPath } from './navigation';
import { seatedCharacterPixels, characterPixels } from './character-art';
import { DEFAULT_CHARACTER } from './onboarding';

it.each(GAME_BENCHES)('permite llegar al banco $id sin atravesar su asiento',bench=>{
  expect(canStand({x:bench.x+bench.w/2,y:bench.y+bench.h/2})).toBe(false);
  expect(canStand(bench.approach)).toBe(true);
  expect(findWalkPath(SPAWN,bench.approach,canStand).length).toBeGreaterThan(0);
  const target={...bench.approach,benchId:bench.id};
  expect(reachedBench(SPAWN,target)).toBeNull();
  expect(reachedBench(bench.approach,target)?.id).toBe(bench.id);
  expect(reachedBench(bench.approach,null)).toBeNull();
});
it('mantiene los rasgos y dobla las piernas al sentarse',()=>{
  const standing=characterPixels(DEFAULT_CHARACTER),seated=seatedCharacterPixels(DEFAULT_CHARACTER);
  expect(seated.filter(p=>p.y<25)).toEqual(standing.filter(p=>p.y<25));
  expect(seated.filter(p=>p.y>=25)).not.toEqual(standing.filter(p=>p.y>=25));
});
