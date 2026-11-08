// Original pixel interpretation of the reference photographs supplied by the user.
// All geometry uses integer pixels; no photographs or external assets are loaded.
type Rect = (color: number, x: number, y: number, w: number, h: number, alpha?: number) => void;
export function drawNodo(r: Rect) {
  // Broad white portal, flat roof, blue glass wings and recessed central bridge.
  r(0x4c654e, 62, 190, 309, 18, .35);
  r(0x9ca69b, 64, 86, 294, 111);
  r(0xe4e1cd, 64, 79, 294, 20);
  r(0xf4efda, 64, 79, 294, 3);
  r(0xbec4b3, 64, 99, 294, 8);
  r(0x969f94, 358, 86, 9, 112);
  r(0x344a58, 74, 106, 274, 87);
  // Repeated panel structure reflects the two-storey glass facade.
  for (const [start, width] of [[74, 109], [241, 107]]) {
    for (let x = start; x < start + width; x += 12) {
      for (let y = 107; y < 190; y += 14) {
        const lower = y > 149;
        r(lower ? 0x365a71 : 0x397fc1, x + 1, y, Math.min(10, start + width - x - 1), 13);
        r(lower ? 0x4d7787 : 0x74acdb, x + 1, y + 1, 2, 11);
        if ((x + y) % 4 === 0) r(0xa4c5cf, x + 3, y + 2, 6, 1, .7);
      }
      // Reflected silhouettes of the gardens.
      r(0x26494c, x + 2, 177 - (x % 5), 9, 14 + (x % 5));
    }
    r(0x263e50, start, 148, width, 4);
    r(0x8fb8d0, start, 152, width, 1);
  }
  // Open portal and glass walkway behind it, characteristic of the Nodo.
  r(0x678d73, 183, 106, 58, 87);
  r(0xadd2dc, 185, 107, 54, 16);
  r(0x355b75, 185, 124, 54, 29);
  for (let x = 187; x < 239; x += 9) { r(0x76a3c4, x, 126, 7, 23); r(0xc4d4cc, x + 1, 129, 4, 1); }
  r(0xe5e7d3, 184, 153, 56, 5);
  r(0x455b4b, 191, 158, 42, 35);
  r(0xb8ceaa, 198, 160, 28, 32);
  r(0x8ea67d, 208, 164, 15, 26);
  r(0xf3eedb, 184, 158, 5, 36); r(0xf3eedb, 235, 158, 5, 36);
  r(0xe8e5d2, 64, 102, 10, 94); r(0xd6d9c6, 348, 102, 10, 94);
  for (let x = 72; x < 355; x += 18) r(0xc3c8ba, x, 83, 1, 15);
  // Pixel lettering based on the blue sign in the photographs.
  const glyphs = ['1000111001101011001110001', '0111010001100011000101110', '1111010001100011000111110', '0111010001100011000101110'];
  glyphs.forEach((glyph, letter) => [...glyph].forEach((bit, i) => {
    if (bit === '1') { r(0x2c618c, 184 + letter * 15 + (i % 5) * 2, 85 + Math.floor(i / 5) * 2, 2, 2); r(0x359fe1, 183 + letter * 15 + (i % 5) * 2, 84 + Math.floor(i / 5) * 2, 2, 2); }
  }));
  // Wide tiered stairs and the main garden walkway.
  for (let i = 0; i < 5; i++) { r(0x939d91, 170 - i * 4, 195 + i * 3, 84 + i * 8, 3); r(0xe0dcc2, 170 - i * 4, 195 + i * 3, 84 + i * 8, 1); }
  // Concrete benches, garden lights and the Argentine flag pole.
  for (const x of [111, 286]) { r(0x697665, x + 2, 231, 24, 3); r(0x9aa797, x + 3, 223, 3, 9); r(0x9aa797, x + 22, 223, 3, 9); r(0xd2d4be, x, 220, 29, 5); for (let n = 3; n < 27; n += 4) r(0x8b998a, x + n, 221, 1, 2); }
  for (const [x,y] of [[143,224],[277,224],[91,201],[326,201]]) { r(0x59685f,x,y-23,2,24); r(0xa8bab0,x-3,y-25,8,2); r(0xf2e7b5,x-2,y-23,6,3); }
  r(0x727e75, 80, 162, 2, 64); r(0xe4dfc1, 79, 161, 3, 3); r(0xb4b8a1, 74, 226, 15, 3);
  // Palm trees with stepped fronds.
  for (const [x,y] of [[42,203],[342,251]]) {
    r(0x5e7248,x-13,y+4,31,5,.35); r(0x7e6848,x,y-50,4,57);
    for (let i=0;i<8;i++) r(0xb19b64,x,y-i*7,3,2);
    for (const side of [-1,1]) for(let i=0;i<5;i++) { r(0x386948,x+side*i*5-3,y-53+Math.floor(i*i/3),7,3); r(0x527e49,x+side*i*4-2,y-56+Math.floor(i*i/5),6,2); }
    r(0x809347,x-2,y-60,4,9);
  }
}
