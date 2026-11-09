import { roomDoor, INTERIOR_WIDTH, INTERIOR_HEIGHT } from '@/lib/course-game/interior';
type Rect=(color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
export function drawInterior(r:Rect,count:number,openRooms?:boolean[]){
 r(0x293f4c,0,0,INTERIOR_WIDTH,INTERIOR_HEIGHT);
 r(0xced7cc,70,64,210,886);r(0x8baaa5,180,50,100,900);r(0xd7d6b7,192,50,76,900);
 for(let y=62;y<950;y+=12)r(0xc3c6a8,192,y,76,1);
 for(let i=0;i<8;i++){
  const d=roomDoor(i),x=94,y=d.y-72;
  r(0x48616b,x,y,84,96);r(0xeee3be,x+4,y+4,76,88);
  r(0x365d58,x+18,y+84,48,7);r(0xc79961,x+8,y+70,22,6);
  for(const dy of [18,36,54])for(const dx of [10,48]){r(0xc79961,x+dx,y+dy,24,6);r(0x507a85,x+dx+7,y+dy-4,10,5);r(0x92724d,x+dx+8,y+dy-8,9,5);}
  const open=i<count&&(!openRooms||openRooms[i]);
  r(0x4b6061,d.x-4,d.y-13,8,26);r(open?0xb89462:0x654b42,d.x-3,d.y-11,6,22);r(0xf7d88e,d.x-1,d.y-2,2,3);
  if(!open){r(0xe6bf64,d.x-4,d.y-3,8,7);r(0x443e39,d.x-1,d.y,2,2);}
 }
 r(0x72523d,126,880,48,12);r(0xcba76c,124,877,52,6);r(0xf5e5b8,127,878,46,2);
 for(const y of [44,944]){r(0x355969,205,y,30,13);r(0xa9cf9c,209,y+3,22,8);}
}
