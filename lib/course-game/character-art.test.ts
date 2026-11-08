import { describe, expect, it } from 'vitest';
import { characterPixels, CHARACTER_COLORS, movementFacing } from './character-art';
import { DEFAULT_CHARACTER, characterSchema } from './onboarding';

describe('orientación del personaje', () => {
  it('conserva personajes guardados antes de incorporar barba', () => {
    const legacy = Object.fromEntries(Object.entries(DEFAULT_CHARACTER).filter(([key])=>key!=='beard'));
    expect(characterSchema.parse(legacy)).toEqual(DEFAULT_CHARACTER);
  });
  it.each(['up', 'down', 'left', 'right'] as const)('representa calvicie y nuevas prendas hacia %s', facing => {
    const bald = {...DEFAULT_CHARACTER, hair:'pelado' as const};
    expect(characterPixels(bald,facing).some(p=>p.color===CHARACTER_COLORS.hairColor.castano)).toBe(false);
    const variants = (['camisa','blusa','falda','vestido','jardinero'] as const).map(outfit=>JSON.stringify(characterPixels({...bald,outfit},facing)));
    expect(new Set(variants).size).toBe(5);
    if(facing!=='up') {
      const beards=['ninguna','corta','completa'].map(beard=>JSON.stringify(characterPixels(characterSchema.parse({...bald,beard}),facing)));
      expect(new Set(beards).size).toBe(3);
    }
  });
  it.each(['up', 'down', 'left', 'right'] as const)('alterna manos y pies hacia %s sin desplazar la sombra', facing => {
    const a = characterPixels(DEFAULT_CHARACTER, facing, Math.PI / 2);
    const b = characterPixels(DEFAULT_CHARACTER, facing, Math.PI * 1.5);
    const hands = (pixels: typeof a) => pixels.filter(p => p.color === CHARACTER_COLORS.skin.media && p.y >= 20);
    const feet = (pixels: typeof a) => pixels.filter(p => p.color === '#493b30');
    expect(hands(a)).not.toEqual(hands(b));
    expect(feet(a)).not.toEqual(feet(b));
    expect(a[0]).toEqual(characterPixels(DEFAULT_CHARACTER, facing)[0]);
    expect(characterPixels(DEFAULT_CHARACTER, facing, 0)).toEqual(characterPixels(DEFAULT_CHARACTER, facing));
  });
  it('mira en las cuatro direcciones y conserva la orientación al detenerse', () => {
    expect(movementFacing(0, -2, 'down')).toBe('up');
    expect(movementFacing(0, 2, 'up')).toBe('down');
    expect(movementFacing(-2, 0, 'down')).toBe('left');
    expect(movementFacing(2, 0, 'down')).toBe('right');
    expect(movementFacing(0, 0, 'left')).toBe('left');
  });
  it('mantiene una orientación estable en diagonal y sigue el desplazamiento permitido', () => {
    expect(movementFacing(2, -2, 'right')).toBe('right');
    expect(movementFacing(2, -2, 'up')).toBe('up');
    expect(movementFacing(0, -2, 'right')).toBe('up');
  });
  it('dibuja espalda sin ojos y perfiles con un ojo, conservando el retrato frontal', () => {
    const eyes = CHARACTER_COLORS.eyes[DEFAULT_CHARACTER.eyes];
    const eyeCount = (facing: 'up' | 'down' | 'left' | 'right') => characterPixels(DEFAULT_CHARACTER, facing).filter(p => p.color === eyes).length;
    expect(eyeCount('up')).toBe(0);
    expect(eyeCount('down')).toBe(2);
    expect(eyeCount('left')).toBe(1);
    expect(eyeCount('right')).toBe(1);
    expect(characterPixels(DEFAULT_CHARACTER)).toEqual(characterPixels(DEFAULT_CHARACTER, 'down'));
  });
});
