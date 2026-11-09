import { DESKS, CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/lib/course-game/classroom';
import { drawChair, drawLaptop } from './furniture-art';
type Rect=(color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
export function drawClassroom(r:Rect){
 r(0x293f4c,0,0,CLASSROOM_WIDTH,CLASSROOM_HEIGHT);
 r(0x788e88,18,48,284,464);r(0xeee6c9,24,54,272,444);
 r(0xb3c6b9,24,54,272,46);r(0x7eaaa5,24,98,272,5);
 for(let y=105;y<496;y+=12)for(let x=26;x<292;x+=18)r((x+y)%36?0xded7b8:0xe5dec2,x,y,17,11);
 r(0x92724d,93,57,134,40);r(0x2c5c53,97,61,126,32);r(0xcccfa8,108,69,62,2);r(0xcccfa8,108,76,41,2);r(0xc9a677,91,95,138,4);
 for(const y of [175,265,355]){r(0x507a85,286,y,9,40);r(0x9ed0da,288,y+3,5,34);}
 // Teacher faces down the room from behind the front-left desk.
 drawChair(r,70,105);r(0x705e49,39,140,80,17);r(0xc09862,36,134,86,10);drawLaptop(r,78,129,.8);
 r(0x537a87,44,130,17,4);
 for(const {x,y,w,h} of DESKS){
  r(0x7c725b,x+3,y+h+7,w,6,.3);
  for(const dx of [7,w-11])r(0x645c4b,x+dx,y+8,4,h+3);
  r(0x866643,x,y,w,h);r(0xc7a26d,x,y,w,15);r(0xe3bf83,x+2,y+1,w-4,2);
  for(const dx of [15,58]){drawChair(r,x+dx,y+21);drawLaptop(r,x+dx-3,y-1);}
 }
 r(0x7c9788,294,139,18,42);r(0xd0c29a,296,143,13,34);r(0x50796b,299,155,7,10);
}
