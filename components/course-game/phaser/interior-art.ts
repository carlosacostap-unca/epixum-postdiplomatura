import { roomDoor } from '@/lib/course-game/interior';
import { drawChair, drawLaptop } from './furniture-art';
type Rect = (color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
/** An imagined teaching interior, not a claim about the real building's floor plan. */
export function drawInterior(r:Rect,count:number,openRooms?:boolean[]) {
  r(0x293f4c,0,0,480,320);
  r(0xced7cc,8,64,464,248);
  for(let y=65;y<310;y+=12) for(let x=9;x<470;x+=12) { r((x+y)%24?0xd9dfcd:0xcbd5c6,x,y,11,11); }
  r(0x8baaa5,8,155,464,50); r(0xb7c6b0,8,175,464,10);
  r(0x8baaa5,228,80,24,75); r(0xd7d6b7,232,80,16,75);
  r(0x829fa0,228,205,24,100); r(0xd7d6b7,232,205,16,100);
  for(let i=0;i<8;i++) {
    const {x}=roomDoor(i), top=i<4, y=top?70:215;
    r(0x48616b,x-47,y,94,70); r(0xeee3be,x-43,y+5,86,60);
    r(0xa4bfae,x-43,y+5,86,4);
    // Blue glass, teaching board, desks, chairs and wall lights.
    r(0x468aaf,x-31,y+7,62,10);
    for(let n=0;n<4;n++) { r(0xb2dae1,x-29+n*16,y+8,12,7); r(0x487682,x-30+n*16,y+8,1,8); }
    r(0x365d58,x-22,y+20,44,11); r(0xd6d7af,x-18,y+23,24,1);
    for(const dx of [-27,9]) { r(0x7e6c51,x+dx,y+40,20,4); r(0xc79961,x+dx,y+36,20,6); drawChair(r,x+dx+5,y+45,.6); drawLaptop(r,x+dx+4,y+32,.5); }
    const dy=top?140:205;
    r(0x4b6061,x-15,dy,30,15); r(i<count?0xb89462:0x7c8884,x-12,dy+2,24,12);
    if(i<count) { r(0xf7d88e,x+7,dy+7,2,2); r(0xdbc89d,x-14,dy,28,2); }
    else r(0xa8b4ac,x-6,dy+6,12,2);
    if (i<count && openRooms && !openRooms[i]) {
      r(0x654b42,x-12,dy+2,24,12); r(0xb89668,x-12,dy+5,24,3);
      r(0xe6bf64,x-3,dy+6,6,6); r(0x443e39,x-1,dy+8,2,2);
    }
  }
  // Reception, plants and a luminous exit at the end of the central passage.
  r(0x8baaa5,228,50,24,105); r(0xd7d6b7,232,50,16,105);
  r(0x8baaa5,208,102,24,20);r(0xd7d6b7,212,106,20,12);
  r(0x426f56,208,102,8,20);r(0xf7d88e,212,111,2,2);
  r(0x355969,225,44,30,13);r(0xa9cf9c,229,47,22,8);
  for(const x of [15,458]) { r(0x947151,x,177,8,9); r(0x4b8056,x-2,170,12,9); r(0x9ab66b,x+2,167,5,8); }
  r(0x355969,225,299,30,13); r(0xa9cf9c,229,301,22,8); r(0x47704d,237,302,6,6);
}
