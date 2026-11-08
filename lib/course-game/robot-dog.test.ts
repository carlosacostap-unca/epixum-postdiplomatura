import { NODO_ENTRANCE } from './neighborhood';
import {describe,expect,it} from 'vitest';
import {createRobotCompanion,updateRobotCompanion,robotDogPixels,clearOfCompanion} from './robot-dog';
import {walk,emptyWalkInput,canStand,SPAWN} from './movement';
import {findWalkPath,followWalkPath} from './navigation';
import {canStandInClass} from './classroom';
import {canStandInside} from './interior';
describe('perro robot compañero',()=>{
  it('vuelve a apartarse de inmediato aunque esté esperando después de ceder el paso',()=>{
    const player={x:200,y:190},pet=createRobotCompanion(player,canStandInClass);
    pet.yielding=1100;pet.route=[];
    const before={...pet.position};
    updateRobotCompanion(pet,player,33,canStandInClass,false,{x:1,y:0});
    expect(pet.position).not.toEqual(before);
    expect(clearOfCompanion(player,pet.position)).toBe(true);
  });
  it('descarta una maniobra bloqueada sin exigir otro clic',()=>{
    const player={x:200,y:190},pet=createRobotCompanion(player,canStandInClass);
    pet.yielding=1100;pet.route=[player];
    for(let i=0;i<4 && pet.yielding;i++) updateRobotCompanion(pet,player,33,canStandInClass,false,{x:1,y:0});
    expect(pet.yielding).toBe(0);
    const before={...pet.position};
    updateRobotCompanion(pet,player,33,canStandInClass,false,{x:1,y:0});
    expect(pet.position).not.toEqual(before);
  });
  it('mantiene libre el inicio de una ruta después de esperar junto al personaje',()=>{
    const player={...SPAWN};
    const pet=createRobotCompanion(player,canStand);
    for(let i=0;i<90;i++) updateRobotCompanion(pet,player,33,canStand,false);
    const path=findWalkPath(player,NODO_ENTRANCE,p=>canStand(p)&&clearOfCompanion(p,pet.position,1));
    expect(path.length).toBeGreaterThan(0);
  });
  it('puede apartarse al contacto desde el punto inicial del jardín',()=>{
    let player={...SPAWN};
    const pet=createRobotCompanion(player,canStand);
    for(let i=0;i<120;i++) {
      player=walk(player,{...emptyWalkInput(),right:true},33,p=>canStand(p)&&clearOfCompanion(p,pet.position,1));
      updateRobotCompanion(pet,player,33,canStand,false,{x:1,y:0});
      expect(clearOfCompanion(player,pet.position)).toBe(true);
    }
    expect(player.x).toBeGreaterThan(SPAWN.x+50);
  });
  it('se aparta y deja pasar sin solaparse en un pasillo estrecho',()=>{
    const allowed=(p:{x:number;y:number})=>canStandInside(p,8);
    let player={x:240,y:265};
    const pet=createRobotCompanion(player,allowed);
    pet.position={x:240,y:244};
    let yielded=false;
    for(let i=0;i<350 && player.y>184;i++) {
      player=walk(player,{...emptyWalkInput(),up:true},33,p=>allowed(p)&&clearOfCompanion(p,pet.position));
      updateRobotCompanion(pet,player,33,allowed,false,{x:0,y:-1});
      yielded ||= pet.yielding>0;
      expect(clearOfCompanion(player,pet.position)).toBe(true);
      expect(allowed(pet.position)).toBe(true);
    }
    expect(yielded).toBe(true);
    expect(player.y).toBeLessThanOrEqual(184);
  });
  it('cede el paso también ante un destino de clic y espera antes de seguir',()=>{
    let player={x:200,y:190};
    const pet=createRobotCompanion(player,canStandInClass);
    for(let i=0;i<90;i++) {
      const destination={x:280,y:190};
      const route=findWalkPath(player,destination,p=>canStandInClass(p)&&clearOfCompanion(p,pet.position));
      player=followWalkPath(player,route,33,p=>canStandInClass(p)&&clearOfCompanion(p,pet.position));
      updateRobotCompanion(pet,player,33,canStandInClass,false,{x:destination.x-player.x,y:destination.y-player.y});
      expect(clearOfCompanion(player,pet.position)).toBe(true);
    }
    expect(player.x).toBeGreaterThan(250);
  });
  it('bloquea el paso directo con teclado incluso tras frames largos',()=>{
    const dog={x:260,y:190};
    const allowed=(p:{x:number;y:number})=>canStandInClass(p)&&clearOfCompanion(p,dog);
    let player={x:220,y:190};
    for(let i=0;i<50;i++) player=walk(player,{...emptyWalkInput(),right:true},1000,allowed);
    expect(player.x).toBeLessThanOrEqual(238);
    expect(clearOfCompanion(player,dog)).toBe(true);
  });
  it('rodea al perro al caminar hacia un destino y no acepta un destino encima',()=>{
    const dog={x:240,y:190},start={x:200,y:190},goal={x:280,y:190};
    const allowed=(p:{x:number;y:number})=>canStandInClass(p)&&clearOfCompanion(p,dog);
    expect(findWalkPath(start,dog,allowed)).toEqual([]);
    const route=findWalkPath(start,goal,allowed);
    expect(route.length).toBeGreaterThan(0);
    let player=start;
    for(let i=0;i<300&&route.length;i++) {
      player=followWalkPath(player,route,33,allowed);
      expect(clearOfCompanion(player,dog)).toBe(true);
    }
    expect(player).toEqual(goal);
  });
  it('sigue al alumno rodeando escritorios y mantiene distancia al llegar',()=>{
    const pet=createRobotCompanion({x:240,y:280},canStandInClass);
    const target={x:55,y:120};
    for(let i=0;i<1000;i++) {
      const before={...pet.position};
      updateRobotCompanion(pet,target,33,canStandInClass,false);
      expect(canStandInClass(pet.position)).toBe(true);
      expect(Math.hypot(pet.position.x-before.x,pet.position.y-before.y)).toBeLessThanOrEqual(1.981);
    }
    expect(Math.hypot(pet.position.x-target.x,pet.position.y-target.y)).toBeCloseTo(24,0);
    const rest={...pet.position};
    updateRobotCompanion(pet,target,33,canStandInClass,false);
    expect(pet.position).toEqual(rest);
    expect(pet.phase).toBe(0);
  });
  it('espera mientras se consulta un panel',()=>{
    const pet=createRobotCompanion({x:240,y:280},canStandInClass);
    const before={...pet.position};
    updateRobotCompanion(pet,{x:240,y:120},50,canStandInClass,true);
    expect(pet.position).toEqual(before);
    expect(pet.phase).toBe(0);
  });
  it('tiene siluetas por dirección y patas animadas',()=>{
    const front=robotDogPixels('down'),back=robotDogPixels('up');
    expect(front).not.toEqual(back);
    expect(robotDogPixels('left')).not.toEqual(robotDogPixels('right'));
    expect(robotDogPixels('right',Math.PI/2)).not.toEqual(robotDogPixels('right',Math.PI*1.5));
  });
});
