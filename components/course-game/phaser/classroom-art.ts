import { DESKS, CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/lib/course-game/classroom';
import { drawChair, drawLaptop } from './furniture-art';
type Rect=(color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
export function drawClassroom(r:Rect){
 r(0x293f4c,0,0,CLASSROOM_WIDTH,CLASSROOM_HEIGHT);
 r(0x788e88,18,48,284,464);r(0xeee6c9,24,54,272,444);
 for(let y=55;y<458;y+=12)for(let x=26;x<292;x+=18)r((x+y)%36?0xded7b8:0xe5dec2,x,y,17,11);
 // West wall (bottom of the screen), with board facing the classroom.
 r(0xb3c6b9,24,458,272,40);r(0x7eaaa5,24,458,272,5);
 r(0x92724d,93,464,134,32);r(0x2c5c53,97,468,126,24);r(0xcccfa8,108,474,62,2);r(0xcccfa8,108,481,41,2);r(0xc9a677,91,496,138,4);
 for(const y of [100,190,280]){r(0x507a85,286,y,9,40);r(0x9ed0da,288,y+3,5,34);}
 // Teacher looks east/up; students look west/down.
 drawChair(r,70,438);r(0x705e49,39,420,80,17);r(0xc09862,36,414,86,10);drawLaptop(r,78,409,.8);r(0x537a87,44,410,17,4);
 for(const {x,y,w,h} of DESKS){
  r(0x7c725b,x+3,y+h+7,w,6,.3);
  for(const dx of [7,w-11])r(0x645c4b,x+dx,y+8,4,h+3);
  r(0x866643,x,y,w,h);r(0xc7a26d,x,y,w,15);r(0xe3bf83,x+2,y+1,w-4,2);
  for(const dx of [15,58]){
   drawChair(r,x+dx,y-25);
   // Keyboard above, rear of the screen below, facing the seated student.
   r(0xa4b3b8,x+dx-3,y+3,24,6);r(0x4d6571,x+dx,y+4,18,3);
   r(0x263e50,x+dx-2,y+9,22,10);r(0x477e9a,x+dx+6,y+12,6,2);
  }
 }
 // South wall (right), near its west end.
 r(0x7c9788,294,379,18,42);r(0xd0c29a,296,383,13,34);r(0x50796b,299,395,7,10);
}
