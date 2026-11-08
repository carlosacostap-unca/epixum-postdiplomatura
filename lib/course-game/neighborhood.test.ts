import {describe,it,expect} from 'vitest';
import {ROADS,NEIGHBORHOOD_BUILDINGS,WORLD_WIDTH,WORLD_HEIGHT,NODO_ENTRANCE,NODO_REAR_ENTRANCE,NODO_FOOTPRINT,southUpPoint} from './neighborhood';
import {canStand,SPAWN,insideNodo,nearNodo,walk,emptyWalkInput} from './movement';
import {findWalkPath,clearSegment} from './navigation';
describe('barrio ampliado del Nodo',()=>{
 it('continúa Colón al norte de Güemes hasta el límite del mapa, sin obstáculos',()=>{
  const colon=ROADS.find(r=>r.name==='AV. COLÓN')!,guemes=ROADS.find(r=>r.name==='AV. GÜEMES')!;
  expect(colon.y).toBe(0);
  expect(colon.y+colon.h).toBe(WORLD_HEIGHT);
  const x=colon.x+colon.w/2;
  const south={x,y:guemes.y-15},north={x,y:WORLD_HEIGHT-12};
  expect(clearSegment(south,north,canStand)).toBe(true);
  for(let y=guemes.y+guemes.h;y<WORLD_HEIGHT-12;y+=4) expect(canStand({x,y})).toBe(true);
 });
 it('orienta el frente hacia Güemes y Virgen del Valle, con la plaza detrás',()=>{
  const guemes=ROADS.find(r=>r.name==='AV. GÜEMES')!,virgen=ROADS.find(r=>r.name==='VIRGEN DEL VALLE')!;
  expect(virgen.y).toBeGreaterThan(guemes.y);
  expect(NODO_ENTRANCE.y).toBeLessThan(guemes.y);
  expect(NODO_ENTRANCE.y).toBeGreaterThan(NODO_REAR_ENTRANCE.y);
  expect(southUpPoint(500,550).y).toBeLessThan(NODO_REAR_ENTRANCE.y);
  expect(southUpPoint(0,0)).toEqual({x:960,y:960});
 });
 it('permite entrar desde atrás sin atravesar el centro ni los laterales del edificio',()=>{
  let position={x:NODO_REAR_ENTRANCE.x,y:NODO_REAR_ENTRANCE.y-24};
  expect(nearNodo(position)).toBe(true);expect(insideNodo(position)).toBe(false);
  for(let i=0;i<30&&!insideNodo(position);i++) position=walk(position,{...emptyWalkInput(),down:true},33);
  expect(insideNodo(position)).toBe(true);
  expect(canStand({x:NODO_REAR_ENTRANCE.x+25,y:NODO_FOOTPRINT.y+5})).toBe(false);
  expect(insideNodo({x:NODO_REAR_ENTRANCE.x+20,y:NODO_REAR_ENTRANCE.y})).toBe(true);
  expect(insideNodo({x:NODO_REAR_ENTRANCE.x,y:NODO_REAR_ENTRANCE.y-5})).toBe(false);
  expect(canStand({x:NODO_REAR_ENTRANCE.x,y:NODO_FOOTPRINT.y+40})).toBe(false);
 });
 it('mantiene las calles transversales fuera del predio y el desfase Colón/Virgen del Valle',()=>{
  const colon=ROADS.find(r=>r.name==='AV. COLÓN')!,virgen=ROADS.find(r=>r.name==='VIRGEN DEL VALLE')!;
  expect(colon.x).toBeGreaterThan(virgen.x);
  expect(ROADS.find(r=>r.name==='SAN JUAN')!.x).toBe(colon.x+colon.w);
  expect(ROADS.find(r=>r.name==='LA RIOJA')!.x).toBe(0);
  for(const b of NEIGHBORHOOD_BUILDINGS){expect(b.x+b.w).toBeLessThanOrEqual(WORLD_WIDTH);expect(b.y+b.h).toBeLessThanOrEqual(WORLD_HEIGHT);}
 });
 it.each([NODO_ENTRANCE,NODO_REAR_ENTRANCE,southUpPoint(655,870),southUpPoint(320,600),southUpPoint(850,820),southUpPoint(500,220)])('conecta la plaza con %j sin atravesar edificios',target=>{
  const route=findWalkPath(SPAWN,target,canStand);
  expect(route.length).toBeGreaterThan(0);
  let previous=SPAWN;
  for(const point of route){expect(clearSegment(previous,point,canStand)).toBe(true);previous=point;}
  expect(route.at(-1)).toEqual(target);
 });
});
