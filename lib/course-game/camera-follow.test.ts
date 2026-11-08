import { afterEach, expect, it, vi } from 'vitest';
import { createCameraFollow } from './camera-follow';

afterEach(() => vi.unstubAllGlobals());

it('se acerca gradualmente a un destino móvil y termina al detenerse el personaje', () => {
  const frames = new Map<number, FrameRequestCallback>(); let id=0, now=performance.now();
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++id,callback);return id;});
  vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
  const advance=()=>{now+=16;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(now));};
  const viewport=document.createElement('div'), camera=createCameraFollow();
  camera.moveTo(viewport,600,300);
  expect(viewport.scrollLeft).toBe(0);
  advance();
  expect(viewport.scrollLeft).toBeGreaterThan(0);expect(viewport.scrollLeft).toBeLessThan(120);
  camera.moveTo(viewport,640,320);
  expect(frames.size).toBe(1);
  for(let i=0;i<150;i++) advance();
  expect(viewport.scrollLeft).toBe(640);expect(viewport.scrollTop).toBe(320);expect(frames.size).toBe(0);
  camera.moveTo(viewport,900,700);camera.stop();advance();
  expect(viewport.scrollLeft).toBe(640);expect(frames.size).toBe(0);
  camera.moveTo(viewport,20,30,true);
  expect(viewport.scrollLeft).toBe(20);expect(viewport.scrollTop).toBe(30);
});
