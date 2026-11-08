import { INTRODUCTION_DOOR } from './interior';
import { describe, expect, it } from 'vitest';
import { argentinaDateTime, classHasStarted } from './schedule';
import { canStandInside, enteredRoom } from './interior';
describe('horarios del aula',()=>{
  it('abre exactamente al inicio y rechaza horarios sin confirmar',()=>{
    const date='2026-11-10T23:00:00Z', start=Date.parse(date);
    expect(classHasStarted(date,start-1)).toBe(false);
    expect(classHasStarted(date,start)).toBe(true);
    expect(classHasStarted('',start)).toBe(false);
    expect(classHasStarted('incorrecta',start)).toBe(false);
    expect(argentinaDateTime(start)).toContain('20:00:00');
    expect(argentinaDateTime(Date.parse('2026-11-11T01:00:00Z'))).toContain('10/11/2026');
  });
  it('una puerta cerrada impide entrar tanto caminando como por destino',()=>{
    const doors=[false,true,false,false,false,false,false,false];
    expect(canStandInside({x:60,y:146},8,doors)).toBe(false);
    expect(enteredRoom({x:60,y:146},8,doors)).toBeNull();
    expect(canStandInside({x:180,y:146},8,doors)).toBe(true);
    expect(enteredRoom({x:180,y:146},8,doors)).toBe(1);
    expect(canStandInside({x:60,y:180},8,doors)).toBe(true);
    expect(canStandInside(INTRODUCTION_DOOR,8,doors)).toBe(true);
    expect(enteredRoom(INTRODUCTION_DOOR,8,doors)).toBe(-1);
  });
});
