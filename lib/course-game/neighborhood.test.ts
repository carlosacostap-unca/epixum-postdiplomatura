import {describe,it,expect} from 'vitest';
import {ROADS,NEIGHBORHOOD_BUILDINGS,WORLD_WIDTH,WORLD_HEIGHT,NODO_ENTRANCE,NODO_REAR_ENTRANCE,NODO_FOOTPRINT,southUpPoint} from './neighborhood';
import {canStand,SPAWN,insideNodo,nearNodo,walk,emptyWalkInput} from './movement';
import {findWalkPath,clearSegment} from './navigation';
import {drawNeighborhoodRoads} from '@/components/course-game/phaser/neighborhood-art';
describe('barrio ampliado del Nodo',()=>{
 it.each(ROADS)('mantiene transitable todo el tramo de $name ($x, $y)',road=>{
  const horizontal=road.w>road.h;
  const start=horizontal?{x:Math.max(12,road.x+2),y:road.y+road.h/2}:{x:road.x+road.w/2,y:Math.max(12,road.y+2)};
  const end=horizontal?{x:Math.min(WORLD_WIDTH-12,road.x+road.w-2),y:start.y}:{x:start.x,y:Math.min(WORLD_HEIGHT-12,road.y+road.h-2)};
  expect(clearSegment(start,end,canStand)).toBe(true);
  const route=findWalkPath(SPAWN,start,canStand);
  expect(route.at(-1)).toEqual(start);
 });
 it('no dibuja veredas atravesando los cruces de calles',()=>{
  const pixels=new Uint32Array(WORLD_WIDTH*WORLD_HEIGHT);
  drawNeighborhoodRoads((color,x,y,w,h)=>{
   for(let py=Math.max(0,Math.floor(y));py<Math.min(WORLD_HEIGHT,y+h);py++)
    for(let px=Math.max(0,Math.floor(x));px<Math.min(WORLD_WIDTH,x+w);px++) pixels[py*WORLD_WIDTH+px]=color;
  });
  for(const a of ROADS) for(const b of ROADS) {
   if(a===b) continue;
   const left=Math.max(a.x,b.x-6),right=Math.min(a.x+a.w,b.x+b.w+6);
   const top=Math.max(a.y,b.y-6),bottom=Math.min(a.y+a.h,b.y+b.h+6);
   for(let y=top;y<bottom;y++) for(let x=left;x<right;x++) expect(pixels[y*WORLD_WIDTH+x]).not.toBe(0xe8d8b6);
  }
 });
 it.each([['CASEROS','TIERRA DEL FUEGO'],['AYACUCHO','ENTRE RÍOS'],['GRAL. LAVALLE','LA PAMPA']])('conecta %s con %s al cruzar Güemes', (northName,southName)=>{
  const north=ROADS.find(r=>r.name===northName)!,south=ROADS.find(r=>r.name===southName)!,guemes=ROADS.find(r=>r.name==='AV. GÜEMES')!;
  expect(north.x).toBe(south.x);
  expect(north.y).toBe(guemes.y+guemes.h);
  expect(south.y+south.h).toBe(guemes.y);
 });
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
