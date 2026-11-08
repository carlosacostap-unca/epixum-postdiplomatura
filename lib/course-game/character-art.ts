import type { Character } from './onboarding';

export const CHARACTER_COLORS = {
  skin: { clara: '#f4c9a1', media: '#dca678', morena: '#af7954', oscura: '#79513f' },
  hairColor: { castano: '#65452f', negro: '#302c32', rubio: '#d4ae5a', pelirrojo: '#ac5835' },
  eyes: { marron: '#58412b', azul: '#467994', verde: '#527b53' },
  shirt: { verde: '#648653', azul: '#588ca0', violeta: '#8d6b9d', rojo: '#b96858', ocre: '#c99a4d' },
  trousers: { azul: '#425b77', marron: '#796049', gris: '#62666b' },
};
export interface CharacterPixel { x: number; y: number; w: number; h: number; color: string }
export type CharacterFacing = 'up' | 'down' | 'left' | 'right';
export function seatedCharacterPixels(character:Character, facing:CharacterFacing = 'down'):CharacterPixel[] {
  return characterPixels(character,facing).filter(p=>p.color!=='#486040').map(p=>{
    if(p.y<25) return p;
    // Bent knees and short hanging lower legs, with feet turned outward.
    return {...p,x:p.x+(p.x<13?-1:1),y:25+Math.floor((p.y-25)*.6),h:Math.max(1,Math.ceil(p.h*.6))};
  });
}
/** Use actual displacement, including wall sliding; keep the last orientation at rest. */
export function movementFacing(dx: number, dy: number, previous: CharacterFacing): CharacterFacing {
  if (!dx && !dy) return previous;
  if (Math.abs(Math.abs(dx) - Math.abs(dy)) < .001) {
    if ((previous === 'left' && dx < 0) || (previous === 'right' && dx > 0) || (previous === 'up' && dy < 0) || (previous === 'down' && dy > 0)) return previous;
  }
  return Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
}
/** Shared original 24×36 pixel figure, rendered as SVG in React and rectangles in Phaser. */
export function characterPixels(c: Character, facing: CharacterFacing = 'down', phase = 0): CharacterPixel[] {
  const pixels: CharacterPixel[] = [];
  const swing = Math.sin(phase);
  const bob = -Math.round(Math.abs(swing));
  const r = (x: number, y: number, w: number, h: number, color: string) => pixels.push({ x, y: y + bob, w, h, color });
  const skin = CHARACTER_COLORS.skin[c.skin], hair = CHARACTER_COLORS.hairColor[c.hairColor];
  const top = CHARACTER_COLORS.shirt[c.shirt], pants = CHARACTER_COLORS.trousers[c.trousers];
  const side = facing === 'left' || facing === 'right';
  const feminine = c.body === 'mujer';
  const skirt = c.outfit === 'vestido' || c.outfit === 'falda';
  const torso = () => {
    if (feminine) {
      r(side ? 10 : 8, 17, side ? 7 : 10, 4, top);
      r(side ? 11 : 9, 21, side ? 6 : 8, 3, top);
      r(side ? 10 : 8, 24, side ? 8 : 10, 3, top);
    } else r(side ? 9 : 7, 17, side ? 9 : 12, 10, top);
    if (c.outfit === 'blusa' || skirt) {
      r(side ? 11 : 9, 23, side ? 6 : 8, 1, '#ebdfc0');
      if (facing === 'down') { r(10, 18, 6, 1, skin); r(12, 19, 2, 1, skin); }
    }
    if (skirt) {
      const fabric = c.outfit === 'vestido' ? top : pants;
      r(side ? 10 : 8, 24, side ? 8 : 10, 2, fabric);
      r(side ? 9 : 7, 26, side ? 10 : 12, 2, fabric);
      r(side ? 8 : 6, 28, side ? 12 : 14, 2, fabric);
      r(side ? 8 : 6, 30, side ? 12 : 14, 1, '#ebdfc0');
    }
  };
  const beard = () => {
    if (!c.beard || c.beard === 'ninguna' || facing === 'up') return;
    if (side) {
      r(15, 13, 3, 4, hair); r(17, 14, 2, 2, hair);
      if (c.beard === 'completa') { r(13, 16, 6, 3, hair); r(14, 19, 4, 2, hair); }
      r(17, 15, 1, 1, skin);
    } else {
      r(8, 13, 2, 3, hair); r(16, 13, 2, 3, hair); r(10, 15, 6, 2, hair);
      if (c.beard === 'completa') { r(8, 15, 10, 3, hair); r(10, 18, 6, 3, hair); }
      r(11, 14, 4, 1, hair); r(12, 15, 2, 1, skin);
    }
  };
  // Two articulated segments keep shoulders and hips attached during each step.
  const leg = (x: number, step: number) => {
    const reach = side ? Math.round(step * 3) : 0;
    const lift = Math.round(Math.max(0, step) * 2);
    r(x, 25, 4, 4, skirt ? skin : pants);
    r(x + Math.round(reach / 2), 28 - lift, 4, 3, skirt ? skin : pants);
    r(x + reach, 30 - lift, 4, 3, skirt ? skin : pants);
    r(x + reach - (side ? 0 : 1), 32 - lift, side ? 6 : 5, 2, '#493b30');
  };
  const arm = (x: number, step: number) => {
    const reach = side ? Math.round(step * 3) : Math.round(step);
    const lift = side ? -Math.round(Math.abs(step)) : Math.round(step * 2);
    r(x, 18, 3, 4, top);
    r(x + Math.round(reach / 2), 21 + Math.min(0, lift), 3, 3, top);
    r(x + reach, 24 + lift, 3, 3, skin);
  };
  const step = facing === 'up' ? -swing : swing;
  // Shadow stays planted, independent of the body's small vertical bounce.
  pixels.push({ x: 5, y: 33, w: 15, h: 2, color: '#486040' });
  if (facing === 'left' || facing === 'right') {
    // A genuine side silhouette: one visible eye, projecting nose and narrow torso.
    arm(14, step);
    leg(13, -step); leg(9, step);
    torso();
    if (c.outfit === 'jardinero') { r(14, 18, 2, 9, pants); r(14, 23, 4, 4, pants); }
    arm(10, -step);
    r(12, 15, 4, 4, skin); r(10, 6, 8, 10, skin); r(17, 11, 3, 2, skin);
    r(16, 10, 1, 2, CHARACTER_COLORS.eyes[c.eyes]); r(16, 15, 2, 1, '#a06b58');
    r(9, 4, 8, 3, skin);
    if (c.hair !== 'pelado') { r(8, 4, 11, 5, hair); r(9, 3, 8, 2, hair); r(8, 8, 4, 7, hair); }
    if (c.hair === 'largo') { r(7, 7, 5, 16, hair); r(8, 20, 5, 3, hair); }
    if (c.hair === 'rizado') { r(6, 5, 4, 9, hair); r(10, 2, 4, 2, hair); r(16, 3, 4, 4, hair); }
    if (c.hair === 'coleta') { r(5, 9, 4, 10, hair); r(4, 17, 4, 4, hair); r(6, 9, 3, 2, top); }
    beard();
    if (c.accessory === 'anteojos') { r(15, 9, 4, 4, '#413e39'); r(12, 10, 4, 1, '#413e39'); r(16, 10, 2, 2, '#b4cbd0'); }
    if (c.accessory === 'sombrero') { r(8, 0, 10, 4, '#c7a25b'); r(8, 3, 10, 2, '#806043'); r(6, 5, 16, 2, '#e3c37b'); }
    return facing === 'left' ? pixels.map(p => ({ ...p, x: 24 - p.x - p.w })) : pixels;
  }
  if (facing === 'up') {
    // Back view has no facial features; clothing and hair remain personalized.
    leg(8, step); leg(14, -step);
    torso();
    arm(feminine ? 6 : 5, -step); arm(feminine ? 17 : 18, step); r(10, 15, 5, 3, skin);
    if (c.outfit === 'jardinero') { r(9, 18, 2, 8, pants); r(15, 18, 2, 8, pants); r(10, 23, 6, 4, pants); }
    r(7, 5, 12, 10, c.hair === 'pelado' ? skin : hair); r(8, 3, 10, 3, c.hair === 'pelado' ? skin : hair); r(9, 14, 8, 2, c.hair === 'pelado' ? skin : hair);
    if (c.hair === 'largo') { r(6, 7, 14, 15, hair); r(8, 21, 10, 3, hair); }
    if (c.hair === 'rizado') { r(5, 6, 4, 8, hair); r(17, 6, 4, 8, hair); r(10, 2, 3, 2, hair); r(15, 2, 3, 3, hair); }
    if (c.hair === 'coleta') { r(10, 12, 6, 10, hair); r(11, 21, 4, 3, hair); r(10, 11, 6, 2, top); }
    if (c.accessory === 'sombrero') { r(8, 0, 10, 4, '#c7a25b'); r(8, 3, 10, 2, '#806043'); r(4, 5, 18, 2, '#e3c37b'); }
    return pixels;
  }
  if (c.hair === 'largo') { r(6, 5, 13, 19, hair); r(5, 10, 15, 11, hair); }
  leg(8, step); leg(14, -step);
  torso();
  arm(feminine ? 6 : 5, -step); arm(feminine ? 17 : 18, step);
  if (!skirt) r(8, 26, 10, 1, '#4c4535');
  r(10, 16, 5, 3, skin);
  r(8, 6, 10, 8, skin); r(feminine ? 9 : 8, 14, feminine ? 8 : 10, 2, skin); r(7, 9, 12, feminine ? 4 : 5, skin);
  r(10, 11, 1, 2, CHARACTER_COLORS.eyes[c.eyes]); r(15, 11, 1, 2, CHARACTER_COLORS.eyes[c.eyes]);
  r(12, 15, 3, 1, '#a06b58');
  r(8, 4, 10, 3, skin);
  if (c.hair !== 'pelado') { r(7, 4, 12, 5, hair); r(8, 3, 9, 2, hair); r(7, 8, 2, 3, hair); r(17, 8, 2, 4, hair); }
  if (c.hair === 'corto') r(10, 8, 7, 1, hair);
  if (c.hair === 'rizado') { r(5, 5, 3, 7, hair); r(18, 5, 3, 7, hair); r(9, 2, 3, 2, hair); r(15, 2, 3, 3, hair); }
  if (c.hair === 'coleta') { r(18, 9, 3, 10, hair); r(18, 9, 3, 2, top); }
  if (c.outfit === 'jardinero') { r(9, 18, 2, 8, pants); r(15, 18, 2, 8, pants); r(10, 22, 6, 4, pants); r(11, 22, 4, 2, '#8091a0'); }
  else if (c.outfit === 'camisa') { r(12, 19, 1, 6, '#e6d0a0'); r(10, 18, 2, 2, '#ebdfc0'); r(14, 18, 2, 2, '#ebdfc0'); }
  beard();
  if (c.accessory === 'anteojos') { r(8, 10, 5, 3, '#413e39'); r(14, 10, 5, 3, '#413e39'); r(9, 11, 3, 1, '#b4cbd0'); r(15, 11, 3, 1, '#b4cbd0'); r(13, 11, 1, 1, '#413e39'); }
  if (c.accessory === 'sombrero') { r(8, 0, 10, 4, '#c7a25b'); r(8, 3, 10, 2, '#806043'); r(4, 5, 18, 2, '#e3c37b'); }
  return pixels;
}
