import { WORLD_WIDTH, WORLD_HEIGHT, ROADS } from '@/lib/course-game/neighborhood';
import { drawClassroom } from './classroom-art';
import { robotDogPixels, createRobotCompanion, updateRobotCompanion, clearOfCompanion, type RobotCompanion } from '@/lib/course-game/robot-dog';
import { findWalkPath, followWalkPath } from '@/lib/course-game/navigation';
import { CLASSROOM_SPAWN, canStandInClass, atClassExit } from '@/lib/course-game/classroom';
import { walk, canStand, nodoAccessSide, SPAWN, insideNodo, type WalkInput, type Position } from '@/lib/course-game/movement';
import type { Character } from '@/lib/course-game/onboarding';
import { characterPixels, movementFacing, type CharacterFacing } from '@/lib/course-game/character-art';
import { drawNeighborhood } from './neighborhood-art';
import { drawInterior } from './interior-art';
import { INTERIOR_SPAWN, canStandInside, enteredRoom, atExit, exitSide, type NodoAccess, roomDoor } from '@/lib/course-game/interior';
import * as Phaser from 'phaser';
import { VILLAGE_HEIGHT, VILLAGE_WIDTH } from '@/lib/course-game/village-layout';

export interface VillageState { selected: number; paused: boolean; restored: boolean; count: number; openRooms?: boolean[]; character?: Character; input?: () => WalkInput; destination?: () => Position | null; movementLocked?: boolean; onPosition?: (position: Position) => void; onCompanionPosition?: (position: Position) => void; onEnter?: (side?:NodoAccess) => void; classroom?: boolean; interior?: boolean; onRoom?: (index: number) => void; onExit?: (side?:NodoAccess) => void; spawn?: Position }
export interface VillageEngine { update: (state: VillageState) => void; destroy: () => void }


/** No remote assets or global events. Each mounted map owns one engine. */
export function createVillageEngine(parent: HTMLElement, initial: VillageState, ready: () => void): VillageEngine {
  let state = initial;
  let scene: Pick<VillageScene, 'drawWorld' | 'drawSelection'> | undefined;
  let disposed = false;

  class VillageScene extends Phaser.Scene {
    private actor!: Phaser.GameObjects.Graphics;
    private companionArt!: Phaser.GameObjects.Graphics;
    private companion!: RobotCompanion;
    private position = { ...(state.spawn ?? (state.classroom ? CLASSROOM_SPAWN : state.interior ? INTERIOR_SPAWN : SPAWN)) };
    private stride = 0;
    private route: Position[] = [];
    private routeRetry = 0;
    private lastDestination: Position | null = null;
    private destinationMarker!: Phaser.GameObjects.Graphics;
    private facing: CharacterFacing = 'down';
    private ground!: Phaser.GameObjects.Graphics;
    private environment!: Phaser.GameObjects.Graphics;
    private selection!: Phaser.GameObjects.Graphics;
    private tick = 0;
    private elapsed = 0;

    private rect(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, width: number, height: number, alpha = 1) {
      g.fillStyle(color, alpha).fillRect(Math.round(x), Math.round(y), width, height);
    }

    create() {
      if (disposed) return;
      scene = { drawWorld: () => { this.drawWorld(); this.drawCharacter(); }, drawSelection: () => this.drawSelection() };
      if(!state.interior && !state.classroom) this.cameras.main.setScroll(-40,-40);
      this.ground = this.add.graphics();
      this.environment = this.add.graphics();
      this.selection = this.add.graphics();
      this.destinationMarker = this.add.graphics();
      this.actor = this.add.graphics();
      this.companionArt = this.add.graphics();
      this.companion = createRobotCompanion(this.position, state.classroom ? canStandInClass : state.interior ? p=>canStandInside(p,state.count,state.openRooms) : canStand);
      this.drawWorld();
      if (!state.interior && !state.classroom) {
        for (const road of [...ROADS,{name:'PLAZA RAÚL ALFONSÍN',tx:418,ty:395,w:100,h:10}]) {
          const label=this.add.text(road.tx,road.ty,road.name,{fontFamily:'monospace',fontSize:'6px',color:'#fff4d5',backgroundColor:'#59685d',padding:{x:2,y:1}});
          if(road.h>road.w) label.setAngle(-90);
        }
      }
      this.drawEnvironment();
      this.drawSelection();
      this.drawCharacter();
      this.drawCompanion();
      state.onPosition?.(this.position);
      ready();
    }

    drawWorld() {
      const g = this.ground;
      g.clear();
      if (state.classroom) { drawClassroom((color,x,y,w,h,alpha=1)=>this.rect(g,color,x,y,w,h,alpha)); return; }
      if (state.interior) { drawInterior((color,x,y,w,h,alpha=1)=>this.rect(g,color,x,y,w,h,alpha),state.count,state.openRooms); return; }
      drawNeighborhood((color,x,y,w,h,alpha=1)=>this.rect(g,color,x,y,w,h,alpha));
    }

    drawCharacter() {
      this.actor.clear();
      this.actor.setDepth(this.position.y);
      if (!state.character) return;
      for (const pixel of characterPixels(state.character, this.facing, this.stride)) {
        this.rect(this.actor, Number.parseInt(pixel.color.slice(1), 16), this.position.x - 12 + pixel.x, this.position.y - 34 + pixel.y, pixel.w, pixel.h);
      }
    }

    private drawCompanion() {
      this.companionArt.clear();
      if (!state.character) return;
      const pet = this.companion;
      this.companionArt.setDepth(pet.position.y);
      state.onCompanionPosition?.(pet.position);
      for (const pixel of robotDogPixels(pet.facing,pet.phase)) {
        this.rect(this.companionArt,Number.parseInt(pixel.color.slice(1),16),pet.position.x-16+pixel.x,pet.position.y-24+pixel.y,pixel.w,pixel.h);
      }
    }

    drawSelection() {
      const g = this.selection;
      g.clear();
      if (state.interior || state.selected < 0) return;
      for (const x of [61,360]) { this.rect(g,0xffecac,x,77,5,2); this.rect(g,0xffecac,x,77,2,10); this.rect(g,0xffecac,x,196,5,2); }
    }

    drawEnvironment() {
      const g = this.environment;
      g.clear();
      if (state.interior) return;
      // Tiny birds over the plaza; the real neighborhood has no river here.
      for (let i=0;i<3;i++) {
        const x=415+i*36+Math.sin(this.tick/22+i)*8;
        const y=350+i*37+Math.cos(this.tick/19+i)*3;
        this.rect(g,0xf2dfab,x-3,y,3,1);this.rect(g,0x536557,x,y+1,2,2);this.rect(g,0xf2dfab,x+2,y,3,1);
      }
      const sway=Math.round(Math.sin(this.tick/5));
      this.rect(g,0x7cc6e4,374,644+sway,10,3);
      this.rect(g,0xf7f3dc,374,647+sway,10,2);
      this.rect(g,0x7cc6e4,374,649+sway,10,3);
    }
    update(_time: number, delta: number) {
      const input = state.input?.();
      const destination = state.destination?.() ?? null;
      const allowed = state.classroom ? canStandInClass : state.interior ? (p: Position) => canStandInside(p, state.count, state.openRooms) : canStand;
      const playerAllowed = (p:Position) => allowed(p) && clearOfCompanion(p,this.companion.position,1);
      this.routeRetry += Math.min(delta,50);
      const manual = input && (input.up || input.down || input.left || input.right);
      const intent = manual ? {x:Number(input.right)-Number(input.left),y:Number(input.down)-Number(input.up)} : destination ? {x:destination.x-this.position.x,y:destination.y-this.position.y} : {x:0,y:0};
      if (state.movementLocked || manual || !destination) this.route = [];
      else if (destination !== this.lastDestination || (!this.route.length && this.routeRetry>=250 && Math.hypot(destination.x-this.position.x,destination.y-this.position.y)>1)) {
        this.route = findWalkPath(this.position, destination, allowed);
        this.routeRetry = 0;
      }
      this.lastDestination = destination;
      this.destinationMarker.clear();
      const goal = this.route.at(-1);
      if (goal) {
        for (const [x,y,w,h] of [[-5,-1,3,2],[3,-1,3,2],[-1,-5,2,3],[-1,3,2,3]]) this.rect(this.destinationMarker, 0xffecac, goal.x+x, goal.y+y, w, h);
      }
      const waypoint=this.route[0];
      const travelIntent=manual ? intent : waypoint ? {x:waypoint.x-this.position.x,y:waypoint.y-this.position.y} : intent;
      updateRobotCompanion(this.companion,this.position,delta,allowed,Boolean(state.movementLocked),travelIntent);
      let moved = false;
      if (!state.movementLocked && input && state.character) {
        const next = manual ? walk(this.position, input, delta, playerAllowed) : followWalkPath(this.position, this.route, delta, playerAllowed);
        if (next.x !== this.position.x || next.y !== this.position.y) {
          this.facing = movementFacing(next.x - this.position.x, next.y - this.position.y, this.facing);
          moved = true;
          // A full left/right cycle every 32 world pixels, including diagonal movement.
          this.stride = (this.stride + Math.hypot(next.x - this.position.x, next.y - this.position.y) * Math.PI / 16) % (Math.PI * 2);
          this.position = next;
          const room = state.interior && !state.classroom ? enteredRoom(this.position,state.count,state.openRooms) : null;
          if ((state.classroom && atClassExit(this.position)) || (state.interior && !state.classroom && atExit(this.position))) {
            const side=exitSide(this.position); this.position = { ...INTERIOR_SPAWN }; Object.assign(input,{up:false,down:false,left:false,right:false}); state.onExit?.(side);
          } else if (room !== null) {
            const door = room === -1 ? {x:240} : roomDoor(room); this.position = {x:door.x,y:room<4?166:198};
            Object.assign(input,{up:false,down:false,left:false,right:false}); state.onRoom?.(room);
          } else if (!state.interior && insideNodo(this.position)) {
            const side:NodoAccess=nodoAccessSide(this.position);
            this.position = { ...SPAWN };
            Object.assign(input, { up:false,down:false,left:false,right:false });
            state.onEnter?.(side);
          }
          this.drawCharacter(); state.onPosition?.(this.position);
        }
      }
      if (!moved && this.stride !== 0) {
        this.stride = 0;
        this.drawCharacter();
      }
      this.drawCompanion();
      if (state.paused) return;
      this.elapsed += delta;
      if (this.elapsed < 80) return;
      this.elapsed = 0;
      this.tick++;
      this.drawEnvironment();
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: state.interior || state.classroom ? VILLAGE_WIDTH : WORLD_WIDTH+80, height: state.interior || state.classroom ? VILLAGE_HEIGHT : WORLD_HEIGHT+80,
    backgroundColor: '#88ad58', pixelArt: true, roundPixels: true,
    banner: false, audio: { noAudio: true }, fps: { target: 30 },
    callbacks: { postBoot: instance => instance.canvas.setAttribute('aria-hidden', 'true') },
    scene: VillageScene,
  });
  return {
    update(next) {
      const redraw = state.character !== next.character || state.restored !== next.restored || state.count !== next.count || state.openRooms?.join() !== next.openRooms?.join();
      state = next;
      if (scene) { if (redraw) scene.drawWorld(); scene.drawSelection(); }
    },
    destroy() { disposed = true; scene = undefined; game.destroy(true); },
  };
}
