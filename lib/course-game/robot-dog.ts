import { movementFacing, type CharacterFacing, type CharacterPixel } from './character-art';
import { clearSegment, findWalkPath, followWalkPath } from './navigation';
import type { Position } from './movement';

/** Original pixel figure inspired by the reference: silver chassis, camera visor, articulated legs. */
export function robotDogPixels(facing: CharacterFacing = 'down', phase = 0): CharacterPixel[] {
  const pixels: CharacterPixel[] = [];
  const r = (x:number,y:number,w:number,h:number,color:string) => pixels.push({x,y,w,h,color});
  const dark='#3a454e', steel='#8c9ba5', silver='#c5cdd0', light='#e7ebdf', sensor='#172b36';
  const side=facing==='left'||facing==='right';
  r(3,23,24,2,'#486040');
  const leg=(x:number,y:number,step:number,far=false)=>{
    const stride=Math.round(Math.sin(phase+step)*2), lift=Math.max(0,stride);
    r(x,y,4,4,far?dark:steel);
    r(x+1,y+3,3,4,far?steel:silver);
    r(x+(side?stride:0),y+6-lift,3,3,far?steel:light);
    r(x+(side?stride:0)-1,y+8-lift,4,2,sensor);
  };
  if(side){
    leg(5,12,Math.PI,true); leg(21,12,0,true);
    r(4,6,21,10,dark); r(4,5,19,9,steel); r(6,4,16,7,silver);
    r(8,4,12,2,light); r(10,5,8,2,dark); r(8,11,9,3,steel);
    r(20,7,9,9,steel); r(21,7,7,4,silver); r(26,10,3,6,sensor);
    r(27,11,1,2,'#85dbe0'); r(20,15,7,2,dark);
    leg(5,14,0); leg(20,14,Math.PI);
    r(4,12,6,5,steel); r(5,12,4,2,silver);
    r(19,12,6,5,steel); r(20,12,4,2,light);
    r(14,10,2,1,'#82dbbf'); r(11,10,1,3,dark);
    return facing==='left'?pixels.map(p=>({...p,x:32-p.x-p.w})):pixels;
  }
  leg(7,8,Math.PI,true); leg(21,8,0,true);
  r(7,5,18,13,dark); r(8,4,16,13,steel); r(10,3,12,12,silver);
  r(12,4,8,3,dark); r(10,8,2,5,light);
  leg(6,14,0); leg(22,14,Math.PI);
  r(5,12,6,5,steel); r(22,12,6,5,steel);
  r(6,12,4,2,light); r(23,12,4,2,silver);
  if(facing==='down') {
    r(10,11,12,9,steel); r(11,11,10,3,silver); r(13,14,6,6,sensor);
    r(14,15,4,2,'#85dbe0'); r(15,18,2,1,light); r(10,20,12,2,dark);
  } else {
    r(11,3,10,3,light); r(12,13,8,4,dark);
    r(13,14,1,2,steel); r(16,14,1,2,steel); r(19,14,1,2,steel);
    r(12,18,2,1,'#82dbbf');
  }
  return pixels;
}

type Allowed = (p:Position)=>boolean;
/** Combined ground footprints of the avatar and robot, independent of drawing order. */
export function clearOfCompanion(a:Position,b:Position,clearance=0) {
  return ((a.x-b.x)/(22+clearance))**2 + ((a.y-b.y)/(14+clearance))**2 >= 1;
}
export interface RobotCompanion { position:Position; facing:CharacterFacing; phase:number; route:Position[]; target:Position; elapsed:number; yielding:number }
export function createRobotCompanion(player:Position,allowed:Allowed):RobotCompanion {
  const position=[{x:player.x+23,y:player.y+5},{x:player.x-23,y:player.y+5},{x:player.x,y:player.y-23},player].find(p=>allowed(p)&&clearSegment(player,p,allowed))!;
  return {position:{...position},facing:'down',phase:0,route:[],target:{...player},elapsed:250,yielding:0};
}
function yieldRoute(pet:RobotCompanion,player:Position,intent:Position,allowed:Allowed):Position[] | null {
  const length=Math.hypot(intent.x,intent.y);
  if(!length) return null;
  const dx=intent.x/length,dy=intent.y/length;
  const x=pet.position.x-player.x,y=pet.position.y-player.y;
  if(x*dx+y*dy<0 || x*dx+y*dy>44 || Math.abs(x*dy-y*dx)>25) return null;
  const safe=(p:Position)=>allowed(p)&&clearOfCompanion(p,player);
  // Prefer a nearby side. In a narrow passage, advance to a wider landing first.
  for(const forward of [0,24,48,72]) for(const side of [32,-32,48,-48]) {
    const target={x:pet.position.x+dx*forward-dy*side,y:pet.position.y+dy*forward+dx*side};
    if(!safe(target)) continue;
    const route=findWalkPath(pet.position,target,safe);
    if(route.length) return route;
  }
  // If there is no side space yet, back away in the direction of travel.
  const target={x:pet.position.x+dx*30,y:pet.position.y+dy*30};
  return safe(target) ? findWalkPath(pet.position,target,safe) : null;
}
export function updateRobotCompanion(pet:RobotCompanion,player:Position,delta:number,allowed:Allowed,paused:boolean,intent:Position={x:0,y:0}) {
  if(paused) { pet.phase=0; return; }
  pet.yielding=Math.max(0,pet.yielding-Math.min(delta,50));
  if(!pet.yielding) {
    const route=yieldRoute(pet,player,intent,allowed);
    if(route?.length) { pet.route=route;pet.yielding=1200; }
  }
  if(pet.yielding) {
    const next=followWalkPath(pet.position,pet.route,delta,p=>allowed(p)&&clearOfCompanion(p,player));
    const dx=next.x-pet.position.x,dy=next.y-pet.position.y;
    pet.facing=movementFacing(dx,dy,pet.facing);
    pet.phase=dx||dy?(pet.phase+Math.hypot(dx,dy)*Math.PI/10)%(Math.PI*2):0;
    pet.position=next;
    // Finish the route before returning to following; then wait so the player can pass.
    if(pet.route.length) pet.yielding=1200;
    return;
  }
  const distance=Math.hypot(player.x-pet.position.x,player.y-pet.position.y);
  if(distance<=24) { pet.phase=0;pet.route=[];pet.elapsed=250;return; }
  pet.elapsed+=Math.min(delta,50);
  if(pet.elapsed>=250 && (!pet.route.length || Math.hypot(player.x-pet.target.x,player.y-pet.target.y)>6)) {
    pet.route=findWalkPath(pet.position,player,allowed);pet.target={...player};pet.elapsed=0;
  }
  const next=followWalkPath(pet.position,pet.route,Math.min(delta,(distance-24)/.06),p=>allowed(p)&&clearOfCompanion(p,player));
  const dx=next.x-pet.position.x,dy=next.y-pet.position.y;
  pet.facing=movementFacing(dx,dy,pet.facing);
  pet.phase=dx||dy?(pet.phase+Math.hypot(dx,dy)*Math.PI/10)%(Math.PI*2):0;
  pet.position=next;
}
