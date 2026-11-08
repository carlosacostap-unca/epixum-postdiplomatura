import { DESKS } from '@/lib/course-game/classroom';
type Rect=(color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
export function drawClassroom(r:Rect) {
  r(0x293f4c,0,0,480,320);
  r(0x788e88,18,48,444,264); r(0xeee6c9,24,54,432,244);
  r(0xb3c6b9,24,54,432,46); r(0x7eaaa5,24,98,432,5);
  for(let y=105;y<296;y+=12) for(let x=26;x<452;x+=18) r((x+y)%36?0xded7b8:0xe5dec2,x,y,17,11);
  // Chalkboard and tray, with original pixel chalk marks.
  r(0x92724d,163,57,154,40); r(0x2c5c53,167,61,146,32);
  r(0x7ca596,169,63,2,27); r(0xcccfa8,182,69,62,2); r(0xcccfa8,182,76,41,2);
  r(0xaacbbb,255,70,25,1); r(0xaacbbb,266,64,1,18);
  r(0xc9a677,161,95,158,4); r(0xf2e8cb,284,94,8,2); r(0x8d7b64,299,92,10,4);
  // Windows and sunlight on the floor.
  for(const x of [36,353]) { r(0x507a85,x,61,90,27); for(let n=0;n<4;n++) r(0x9ed0da,x+3+n*22,64,19,21); r(0xe5e7c9,x-2,88,94,3); }
  r(0xfff3c9,355,106,84,25,.5);
  // Teacher desk and books.
  r(0x705e49,71,115,74,17); r(0xc09862,68,110,80,9);
  r(0x537a87,77,107,17,4); r(0xc2cdae,99,105,18,6); r(0xefdfb3,101,106,14,3);
  for(const {x,y,w,h} of DESKS) {
    r(0x7c725b,x+3,y+h+7,w,6,.3);
    for(const dx of [7,w-11]) r(0x645c4b,x+dx,y+8,4,h+3);
    r(0x866643,x,y,w,h); r(0xc7a26d,x,y,w,15); r(0xe3bf83,x+2,y+1,w-4,2);
    for(const dx of [15,58]) { r(0x476a75,x+dx,y+21,18,10); r(0x6b98a0,x+dx+1,y+21,16,4); r(0xf0e9ce,x+dx-1,y+4,14,8); r(0x9eb0a4,x+dx+2,y+6,8,1); }
  }
  r(0x7c9788,219,294,42,18); r(0xd0c29a,223,296,34,13); r(0x50796b,235,299,10,7);
  r(0x937551,431,112,12,13); r(0x4f835c,426,101,22,15); r(0x8db476,432,97,10,11);
}
