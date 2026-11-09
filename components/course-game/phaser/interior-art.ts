import { roomDoor } from '@/lib/course-game/interior';
import { drawChair, drawLaptop } from './furniture-art';
type Rect=(color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
/** Teaching layout imagined for the game, not the building's real floor plan. */
export function drawInterior(r:Rect,count:number,openRooms?:boolean[]){
 r(0x293f4c,0,0,480,320);
 r(0xced7cc,24,64,432,248);
 for(let y=65;y<310;y+=12)for(let x=25;x<454;x+=12)r((x+y)%24?0xd9dfcd:0xcbd5c6,x,y,11,11);
 // Wide central passage, uninterrupted between both entrances.
 r(0x8baaa5,200,50,80,255);r(0xd7d6b7,212,50,56,255);
 for(let y=62;y<300;y+=12)r(0xc3c6a8,212,y,56,1);
 for(let i=0;i<8;i++){
  const d=roomDoor(i),left=i%2===0,x=left?32:284,y=d.y-22;
  r(0x48616b,x,y,164,44);r(0xeee3be,x+4,y+4,156,36);
  r(0x365d58,x+45,y+5,64,7);r(0xd6d7af,x+50,y+8,34,1);
  for(const dx of [22,67,112]){r(0x7e6c51,x+dx,y+22,23,5);r(0xc79961,x+dx,y+19,23,6);drawChair(r,x+dx+6,y+29,.5);drawLaptop(r,x+dx+6,y+15,.5);}
  const open=i<count&&(!openRooms||openRooms[i]);
  r(0x4b6061,d.x-4,d.y-13,8,26);r(open?0xb89462:0x654b42,d.x-3,d.y-11,6,22);
  r(0xf7d88e,d.x-1,d.y-2,2,3);
  if(!open){r(0xe6bf64,d.x-4,d.y-3,8,7);r(0x443e39,d.x-1,d.y,2,2);}
 }
 // Reception on the left of the entrance lobby, outside the main walkway.
 r(0x72523d,140,262,54,12);r(0xcba76c,138,259,58,6);r(0xf5e5b8,141,260,52,2);
 for(const x of [110,360]){r(0x947151,x,280,8,9);r(0x4b8056,x-2,273,12,9);r(0x9ab66b,x+2,270,5,8);}
 for(const y of [44,299]){r(0x355969,225,y,30,13);r(0xa9cf9c,229,y+3,22,8);}
}
