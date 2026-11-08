import { NEIGHBORHOOD_BUILDINGS, PLAZA_BEDS, NODO_OFFSET, NODO_SCALE, NODO_PALMS, ROADS, TREES, BENCHES, WORLD_WIDTH, WORLD_HEIGHT, NODO_STAIRS_WIDTH, NODO_REAR_ENTRANCE, NODO_ENTRANCE, southUpPoint } from '@/lib/course-game/neighborhood';
import { drawNodo } from './nodo-art';
type Paint=(color:number,x:number,y:number,w:number,h:number,alpha?:number)=>void;
export function drawNeighborhoodRoads(paint:Paint) {
 // Paint all sidewalks first: a later street's curb must not cut across asphalt.
 for(const a of ROADS) paint(0xe8d8b6,a.x-6,a.y-6,a.w+12,a.h+12);
 for(const a of ROADS) paint(0x69757a,a.x,a.y,a.w,a.h);
 for(const a of ROADS) {
  if(a.w>a.h) for(let x=a.x;x<a.x+a.w;x+=24) {
   const y=a.y+a.h/2;
   if(!ROADS.some(b=>b!==a&&b.h>b.w&&x+10>b.x&&x<b.x+b.w&&y>=b.y&&y<=b.y+b.h)) paint(0xddcc96,x,y,10,1);
  }
 }
}
export function drawNeighborhood(paint:Paint) {
 let r:Paint=(c,x,y,w,h,a)=>paint(c,WORLD_WIDTH-x-w,WORLD_HEIGHT-y-h,w,h,a);
 r(0xc5b395,0,0,WORLD_WIDTH,WORLD_HEIGHT);
 r(0x9cab74,337,245,302,560);r(0x9fa87a,135,246,166,245);
 for(let i=0;i<1800;i++) r(i%2?0xb3bc87:0x8e9f69,338+(i*47)%299,246+(i*31)%557,2,1);
 drawNeighborhoodRoads(paint);
 for(const x of [300,338,636,674,810,846])for(let y=212;y<238;y+=5)r(0xf2e8cf,x,y,5,2);
 const path=(x:number,y:number,ex:number,ey:number,width=12)=>{const steps=Math.ceil(Math.hypot(ex-x,ey-y)/3);for(let i=0;i<=steps;i++)r(0xe2d3ae,x+(ex-x)*i/steps-width/2,y+(ey-y)*i/steps-width/2,width,width);};
 // Fan-shaped northern garden, diagonal paths and the broad southwestern plaza.
 for(const x of [350,390,445,510,570,620])path(487,277,x,248,9);
 path(344,394,632,394,20);path(500,365,500,410,24);
 path(500,410,407,585,18);path(407,585,445,790,17);path(625,390,490,610,15);
 path(349,490,625,548,13);path(490,610,615,790,12);path(340,800,630,800,16);
 r(0xdfcfad,370,572,75,85);for(let i=0;i<6;i++)r(0xf1e0ba,365+i*2,570+i*14,84-i*2,2);
 r(0xb9a382,144,365,149,125); // open public ground west of Colón
 r=paint;
 // Main approach from Güemes (north / bottom of the screen).
 r(0xe2d3ae,NODO_ENTRANCE.x-17,NODO_ENTRANCE.y,34,52);
 for(const [i,b] of NEIGHBORHOOD_BUILDINGS.entries()){
  const roof=[0xc3b7a0,0xb78266,0xa6b0ac,0xc0aa83][i%4];
  r(0x615c4c,b.x+4,b.y+5,b.w,b.h,.3);r(0xd6bc93,b.x,b.y,b.w,b.h);r(roof,b.x,b.y,b.w,b.h-10);r(0xe5d5b9,b.x+2,b.y+2,b.w-4,2);
  for(let x=b.x+5;x<b.x+b.w-6;x+=12){r(0x4d666b,x,b.y+b.h-7,5,4);r(0x9bb5b5,x,b.y+b.h-7,5,1);}
  r(0x746452,b.x+b.w-8,b.y+b.h-9,5,9);r(0xe5ddcd,b.x+7,b.y+6,8,5);
 }
 for(const b of PLAZA_BEDS){r(0xb7a27b,b.x-2,b.y-2,b.w+4,b.h+4);r(0x688654,b.x,b.y,b.w,b.h);}
 for(const [x,y] of TREES) r(0x596b4b,x-8,y+4,24,7,.35);
 for(const [x,y] of BENCHES){r(0x62594b,x,y,17,3);r(0xc7a57c,x,y-3,17,3);r(0x62594b,x+2,y+3,2,4);r(0x62594b,x+13,y+3,2,4);}
 for(const {x,y} of [[480,417],[535,560],[457,747],[364,555]].map(([x,y])=>southUpPoint(x,y))){r(0x596764,x,y-22,2,23);r(0xf4dfaa,x-2,y-25,6,4);}
 drawNodo((c,x,y,w,h,a)=>r(c,NODO_OFFSET.x+x*NODO_SCALE,NODO_OFFSET.y+y*NODO_SCALE,Math.ceil(w*NODO_SCALE),Math.ceil(h*NODO_SCALE),a));
 for(const [x,y] of NODO_PALMS) r(0x5e7248,NODO_OFFSET.x+(x-13)*NODO_SCALE,NODO_OFFSET.y+(y+4)*NODO_SCALE,31*NODO_SCALE,5*NODO_SCALE,.35);
 // Outdoor rear staircase: no doorway over the roof or the Nodo lettering.
 const rear=NODO_REAR_ENTRANCE;
 r(0xe2d3ae,rear.x-17,rear.y-18,34,18);
 r(0xd8cfb7,rear.x-28,rear.y+12,56,4);
 for(let step=0;step<5;step++) {
  const x=rear.x-NODO_STAIRS_WIDTH/2+step*2.6,y=rear.y-1+step*3,width=NODO_STAIRS_WIDTH-step*5.2;
  r(0x998f79,x,y,width,3);
  r(0xf0e7d0,x,y,width,1);
  r(0xd8cfb7,x,y+1,width,1);
 }
}

/** Each upright tree gets its own depth, shared with the actors' foot positions. */
export function drawTree(paint:Paint,x:number,y:number) {
 paint(0x836249,x,y,3,9);
 paint(0x436649,x-9,y-17,21,20);
 paint(0x759754,x-13,y-12,22,12);
 paint(0x9bb966,x-7,y-17,12,5);
}
