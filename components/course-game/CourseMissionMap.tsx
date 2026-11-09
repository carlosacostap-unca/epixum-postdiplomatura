'use client';
import { TeacherComputer } from './TeacherComputer';
import { computerContent } from '@/lib/course-game/computer';
import { RECEPTIONIST,RECEPTION_ANSWERS } from '@/lib/course-game/reception';
import { useSofiaSave } from './useSofiaSave';
import type { SaveSofia,SofiaProgress } from '@/lib/course-game/sofia';
import { SOFIA, SOFIA_QUESTIONS, INITIAL_SOFIA, sofiaHint, sofiaFeedback } from '@/lib/course-game/sofia';
import { SofiaMission } from './SofiaMission';
import { CharacterPortrait } from './CharacterPortrait';
import { GAME_BENCHES, type WalkDestination } from '@/lib/course-game/benches';
import { useMapZoom } from './useMapZoom';
import { createCameraFollow } from '@/lib/course-game/camera-follow';
import { CompanionChat } from './CompanionChat';
import { NODO_ENTRANCE, NODO_REAR_ENTRANCE, NODO_STAIRS_WIDTH, NODO_FOOTPRINT, WORLD_WIDTH, WORLD_HEIGHT } from '@/lib/course-game/neighborhood';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { SPAWN, nodoAccessSide, emptyWalkInput, nearNodo, type Position, type WalkInput } from '@/lib/course-game/movement';
import { INTERIOR_WIDTH, INTERIOR_HEIGHT, nearbyRoom, nearExit, roomDoor, roomTarget, roomApproach, ROOMS_PER_WING, INTRODUCTION_DOOR, INTERIOR_SPAWN, INTERIOR_FRONT_SPAWN, INTERIOR_REAR_SPAWN, REAR_EXIT, exitSide, type NodoAccess } from '@/lib/course-game/interior';
import { INTRODUCTION_ID, INTRODUCTION_TITLE, courseIntroduction } from '@/lib/course-game/introduction';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT, TEACHER_SEAT, CLASSROOM_SEATS, nearClassExit } from '@/lib/course-game/classroom';
import { LessonBoard } from './LessonBoard';
import type { LoadBoard } from '@/lib/course-game/board';
import Link from 'next/link';
import type { CourseGameView, GameMission } from '@/lib/course-game/model';
import { GameTour, type GameTourProps } from './GameTour';
import { PLATFORM_URL, TOUR_STEPS, type Character } from '@/lib/course-game/onboarding';
import PhaserVillage from './PhaserVillage';
import { GamePanel } from './GamePanel';

import styles from './immersive-game.module.css';
import { useGameSchedule } from './useGameSchedule';
import { argentinaDateTime, type SyncGameSchedule } from '@/lib/course-game/schedule';

type Panel = 'reception' | 'presentation' | 'sofia' | 'notebook' | 'identity' | 'classroom' | 'menu' | 'encounters' | 'missions' | 'journal' | 'help' | 'companion';
const panelTitles: Record<Panel, string> = { reception:'Recepción del curso',presentation:'Computadora del docente',sofia:'Sofía', notebook:'Actividades de la clase', identity:'Mi personaje y mis datos', companion:'Tu perro robot', classroom: 'Tu aula', menu: 'Menú del aula', encounters: 'Clases en el Nodo', missions: 'Misiones', journal: 'Mi diario', help: 'Cómo jugar' };
// Extend this list when adding new game sections. Phaser remains independent.
const menuSections: { panel: Exclude<Panel, 'menu' | 'classroom' | 'identity' | 'notebook' | 'sofia' | 'presentation' | 'reception'>; icon: string; description: string }[] = [
  {panel:'companion',icon:'◈',description:'Tu compañero robot y una pista para continuar'},
  { panel: 'encounters', icon: '⌂', description: 'Todos los encuentros en el Nodo Tecnológico' },
  { panel: 'missions', icon: '⚑', description: 'Trabajos, entregas y devoluciones' },
  { panel: 'journal', icon: '✿', description: 'Tu progreso en el valle' },
  { panel: 'help', icon: '?', description: 'Controles y orientación' },
];
const stateLabels: Record<GameMission['state'], string> = {
  available: 'Por explorar', pending: 'Entrega registrada', resubmitted: 'Reenviado · en revisión',
  correction_requested: 'Una nueva oportunidad', approved: 'Misión completada', rejected: 'Evaluado · desaprobado',
};
function displayDate(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'A tu ritmo';
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value));
}

export default function CourseMissionMap({ game: initialGame, character, tutorial, loadBoard, syncSchedule, renderIdentity,initialSofia,saveSofia,loadPresentation }: { loadPresentation?:LoadBoard; initialSofia?:SofiaProgress;saveSofia?:SaveSofia; renderIdentity?: (close: () => void) => ReactNode; syncSchedule?: SyncGameSchedule; loadBoard?: LoadBoard; game: CourseGameView; character?: Character; tutorial?: GameTourProps }) {
  const { clock, isOpen: scheduledOpen } = useGameSchedule(syncSchedule);
  const game = clock ? {...initialGame, places:clock.schedule.classes.map(c=>({
    id:c.id, date:c.date, title:c.title ?? initialGame.places.find(p=>p.id===c.id)?.title ?? 'Clase',
    name:'Nodo Tecnológico Catamarca', href:`/estudiantes/cursos/${encodeURIComponent(initialGame.courseId)}/clases/${encodeURIComponent(c.id)}`,
  }))} : initialGame;
  const isOpen = (id:string) => id===INTRODUCTION_ID || (game.enabledClassIds ? game.enabledClassIds.includes(id) && game.places.some(p=>p.id===id) : scheduledOpen(id));
  const readBoard = useCallback<LoadBoard>(async id => id === INTRODUCTION_ID ? courseIntroduction(game.courseTitle) : loadBoard ? loadBoard(id) : {success:false,error:'No pudimos cargar esta clase.'}, [game.courseTitle,loadBoard]);
  const readComputer = useCallback<LoadBoard>(async id => {const result=await readBoard(id);return result.success ? {success:true,content:computerContent(result.content)} : result;},[readBoard]);
  const openingLabel = (id: string, date: string) => {
    if(game.enabledClassIds) return game.enabledClassIds.includes(id) ? 'Habilitada para este encuentro' : 'Todavía no habilitada';
    const value = clock?.schedule.classes.find(c=>c.id===id)?.date ?? date;
    return Number.isFinite(Date.parse(value)) ? `Abre ${argentinaDateTime(Date.parse(value))} (Argentina)` : 'Horario por confirmar';
  };
  const [inside, setInside] = useState(false);
  const [spawn,setSpawn] = useState<Position>(SPAWN);
  const [inClass, setInClass] = useState(false);
  const mapWidth = inClass ? CLASSROOM_WIDTH : inside ? INTERIOR_WIDTH : WORLD_WIDTH, mapHeight = inClass ? CLASSROOM_HEIGHT : inside ? INTERIOR_HEIGHT : WORLD_HEIGHT;

  const [requestedWing, setWing] = useState(0);
  const wing = Math.min(requestedWing,Math.max(0,Math.ceil(game.places.length/ROOMS_PER_WING)-1));
  const [nearRoom, setNearRoom] = useState<number | null>(null);
  const [atExit, setAtExit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const classIndex = selectedId === INTRODUCTION_ID ? -1 : selectedId === null ? null : game.places.findIndex(p=>p.id===selectedId);
  const setClassIndex = (index: number) => setSelectedId(index===-1 ? INTRODUCTION_ID : game.places[index]?.id ?? null);
  const roomCount = Math.min(ROOMS_PER_WING, Math.max(0, game.places.length-wing*ROOMS_PER_WING));
  const selectedClass = selectedId === INTRODUCTION_ID ? {id:INTRODUCTION_ID,title:INTRODUCTION_TITLE,date:''} : classIndex === null || classIndex < 0 ? null : game.places[classIndex];
  const [sofiaProgress,setSofiaProgress] = useState(initialSofia ?? INITIAL_SOFIA);
  const hintLevel=sofiaProgress.hintLevel ?? 0;
  const setHintLevel=(hintLevel:number)=>setSofiaProgress(p=>({...p,hintLevel}));
  const sofiaSave=useSofiaSave(sofiaProgress,saveSofia);
  const sofiaClass = game.courseId === '5wdbs1o1p22vszm' && Boolean(selectedClass && /^clase\s*1\b/i.test(selectedClass.title));
  const sofiaActive = inClass && sofiaClass && Boolean(selectedClass && isOpen(selectedClass.id));
  const walking = useRef(emptyWalkInput());
  const companionButton = useRef<HTMLButtonElement>(null);
  const companionTap = useRef<{x:number;y:number;id:number}|null>(null);
  const onCompanionPosition = useCallback((position:Position)=>{
    const button=companionButton.current;
    if(button) {button.style.left=`${position.x/mapWidth*100}%`;button.style.top=`${(position.y-12)/mapHeight*100}%`;button.hidden=false;}
  },[mapWidth,mapHeight]);
  const destination = useRef<WalkDestination | null>(null);
  const [seatedBench,setSeatedBench] = useState<string|null>(null);
  const readDestination = useCallback(() => destination.current, []);
  const tapStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const readInput = useCallback(() => walking.current, []);
  const [atEntrance, setAtEntrance] = useState(false);
  const camera = useMemo(() => createCameraFollow(), []);
  useEffect(() => () => camera.stop(), [camera]);
  const clearWalking = useCallback(() => { Object.assign(walking.current, emptyWalkInput()); destination.current = null; camera.stop(); }, [camera]);
  const mapViewport = useRef<HTMLDivElement>(null);
  const cameraPosition = useRef<Position | null>(null);

  const menuButton = useRef<HTMLButtonElement>(null);
  const hadTutorial = useRef(Boolean(tutorial));
  useEffect(() => { if (hadTutorial.current && !tutorial) menuButton.current?.focus(); hadTutorial.current = Boolean(tutorial); }, [tutorial]);
  const [panel, setPanel] = useState<Panel | null>(null);
  const { zoom, changeZoom, handlers: zoomHandlers } = useMapZoom(clearWalking, mapViewport, Boolean(panel || tutorial));
  const [motionPaused, setMotionPaused] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => { clearWalking(); }, [panel, tutorial, inside, inClass, wing, clearWalking]);
  useEffect(() => {
    const clear = () => clearWalking();
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    return () => { clear(); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
  }, [clearWalking]);
  const onPosition = useCallback((position: Position) => {
    const firstPosition = cameraPosition.current === null;
    cameraPosition.current = position;
    setAtEntrance(!inside && nearNodo(position));
    setNearRoom(inside && !inClass ? nearbyRoom(position,roomCount) : null);
    setAtExit(inClass ? nearClassExit(position) : inside && nearExit(position));

    const viewport = mapViewport.current;
    const map = viewport?.firstElementChild as HTMLElement | null;
    if (!viewport || !map) return;
    const x = position.x / mapWidth * map.offsetWidth + map.offsetLeft, y = position.y / mapHeight * map.offsetHeight + map.offsetTop;
    // A centered viewport is the camera; HTML hit targets share the canvas world coordinates.
    camera.moveTo(viewport,
      Math.max(0, Math.min(map.offsetWidth+map.offsetLeft*2-viewport.clientWidth,x-viewport.clientWidth/2)),
      Math.max(0, Math.min(map.offsetHeight+map.offsetTop*2-viewport.clientHeight,y-viewport.clientHeight/2)),
      firstPosition || reducedMotion);
  }, [inside, inClass, roomCount, mapWidth, mapHeight, camera, reducedMotion]);
  useEffect(() => {
    const viewport = mapViewport.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (cameraPosition.current) onPosition(cameraPosition.current);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [onPosition]);
  useLayoutEffect(() => {
    camera.stop();
    cameraPosition.current = null;
  }, [inside, inClass, wing, camera]);
  const enterNodo = useCallback((side:NodoAccess='front') => { setSpawn(side==='rear' ? INTERIOR_REAR_SPAWN : INTERIOR_FRONT_SPAWN); clearWalking(); setInside(true); setWing(0); setAtEntrance(false); mapViewport.current?.focus(); }, [clearWalking]);
  const exitNodo = useCallback((side:NodoAccess='front') => { setSpawn(side==='rear' ? {x:NODO_REAR_ENTRANCE.x,y:NODO_REAR_ENTRANCE.y-30} : SPAWN); clearWalking(); setInside(false); setNearRoom(null); setAtExit(false); mapViewport.current?.focus(); }, [clearWalking]);
  const openRoom = (index: number) => { if(index===-1){clearWalking();setPanel('reception');return;} if (index !== -1 && (index < 0 || index >= roomCount || !isOpen(game.places[wing*ROOMS_PER_WING+index].id))) return; clearWalking(); setClassIndex(index === -1 ? -1 : wing*ROOMS_PER_WING+index); setInClass(true); setAtExit(false); setNearRoom(null); mapViewport.current?.focus(); };
  const leaveClass = useCallback(() => { clearWalking(); setSpawn(classIndex===null ? INTERIOR_SPAWN : roomApproach(classIndex%ROOMS_PER_WING)); setPanel(null); setInClass(false); setAtExit(false); mapViewport.current?.focus(); }, [clearWalking,classIndex]);
  const walkToEntrance = (target: WalkDestination) => {
    if (panel || tutorial) return;
    clearWalking();
    destination.current = target;
    mapViewport.current?.focus();
  };
  const keyDirection = (key: string): keyof WalkInput | undefined => ({ arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' } as Record<string, keyof WalkInput>)[key.toLowerCase()];

  const [missionFilter, setMissionFilter] = useState('all');

  const paused = motionPaused ?? reducedMotion;
  const missions = game.missions.filter(mission => missionFilter === 'all' || (missionFilter === 'complete' ? mission.state === 'approved' : mission.state !== 'approved'));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  return <main onClickCapture={e=>{if(sofiaSave.dirty && (e.target as HTMLElement).closest('a'))e.preventDefault();}} data-location={inside ? "interior" : "exterior"} data-tour={tutorial ? TOUR_STEPS[tutorial.step]?.target : undefined} className={styles.world} aria-label={`Aula: ${game.title}`}
    onKeyDown={event => {
      if (panel || tutorial || event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = keyDirection(event.key);
      if (direction) { event.preventDefault(); destination.current = null; walking.current[direction] = true; }
      if (event.key.toLowerCase() === 'e') { event.preventDefault(); if (inClass && atExit) leaveClass(); else if (inside && nearRoom !== null) openRoom(nearRoom); else if (inside && atExit) exitNodo(exitSide(cameraPosition.current ?? INTERIOR_SPAWN)); else if (atEntrance) enterNodo(nodoAccessSide(cameraPosition.current ?? SPAWN)); }
    }} onKeyUp={event => { const direction = keyDirection(event.key); if (direction) { event.preventDefault(); walking.current[direction] = false; } }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) clearWalking(); }}>
    <div ref={mapViewport} {...zoomHandlers} className={styles.viewport} aria-label={inClass ? 'Interior del aula' : inside ? 'Interior del Nodo' : 'Mapa del valle'} tabIndex={0} onPointerDown={event => { if (!(event.target as HTMLElement).closest('button')) event.currentTarget.focus(); }}>
      <div className={styles.map} style={{'--map-zoom':zoom,...(!inside ? {width:`max(${WORLD_WIDTH*2*zoom}px, 100cqw, 100cqh)`,height:`max(${WORLD_HEIGHT*2*zoom}px, 100cqw, 100cqh)`} : {width:`max(${mapWidth*(inClass?1:2)*zoom}px, 100cqw, ${100*mapWidth/mapHeight}cqh)`,height:`max(${mapHeight*(inClass?1:2)*zoom}px, ${100*mapHeight/mapWidth}cqw, 100cqh)`})} as CSSProperties}
        onPointerDown={event => {
          if (event.button !== 0 || !event.isPrimary || (event.target as HTMLElement).closest('button') || panel || tutorial) return;
          tapStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => { tapStart.current = null; }}
        onPointerMove={event => {
          const start = tapStart.current;
          if (start && start.id === event.pointerId && Math.hypot(event.clientX-start.x,event.clientY-start.y)>8) tapStart.current = null;
        }}
        onPointerUp={event => {
          const start = tapStart.current; tapStart.current = null;
          if (!start || start.id !== event.pointerId || panel || tutorial || (event.target as HTMLElement).closest('button') || Math.hypot(event.clientX-start.x,event.clientY-start.y)>8) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          clearWalking();
          destination.current = { x: (event.clientX-bounds.left)/bounds.width*mapWidth, y: (event.clientY-bounds.top)/bounds.height*mapHeight };
        }}>
        <PhaserVillage canPresent={game.canPresent} onPresent={()=>{if(game.canPresent && selectedClass && isOpen(selectedClass.id)){clearWalking();setPanel('presentation');}}} sofia={sofiaActive} onNotebook={()=>{if(inClass && selectedClass && isOpen(selectedClass.id)) {clearWalking();setPanel('notebook');}}} onSeated={setSeatedBench} spawn={inClass ? undefined : spawn} key={inClass ? `class-${selectedId}` : inside ? `inside-${wing}-${game.places.map(p=>p.id).join("-")}` : 'outside'} classroom={inClass} interior={inside} onRoom={openRoom} onExit={inClass ? leaveClass : exitNodo} openRooms={game.places.slice(wing*ROOMS_PER_WING,(wing+1)*ROOMS_PER_WING).map(p=>isOpen(p.id))} onCompanionPosition={onCompanionPosition} input={readInput} destination={readDestination} movementLocked={panel !== null || Boolean(tutorial)} onPosition={onPosition} onEnter={enterNodo} character={character} selected={panel === 'encounters' ? 0 : -1} paused={paused || panel !== null} restored={game.completed > 0} count={inside ? roomCount : game.places.length} />
        {!inside && <button type="button" className={styles.nodoEntrance} style={{left:NODO_FOOTPRINT.x/mapWidth*100+'%',top:NODO_FOOTPRINT.y/mapHeight*100+'%',width:NODO_FOOTPRINT.w/mapWidth*100+'%',height:NODO_FOOTPRINT.h/mapHeight*100+'%'}} aria-label="Entrar al Nodo Tecnológico Catamarca" onClick={() => walkToEntrance(NODO_ENTRANCE)}>
        </button>}
        {!inside && <button type="button" className={styles.nodoEntrance} style={{left:(NODO_REAR_ENTRANCE.x-NODO_STAIRS_WIDTH/2)/mapWidth*100+'%',top:(NODO_REAR_ENTRANCE.y-8)/mapHeight*100+'%',width:NODO_STAIRS_WIDTH/mapWidth*100+'%',height:20/mapHeight*100+'%'}} aria-label="Entrar por detrás al Nodo Tecnológico Catamarca" onClick={() => walkToEntrance(NODO_REAR_ENTRANCE)} />}
        {!inside && character && GAME_BENCHES.map((bench,index)=><button key={bench.id} type="button" className={styles.benchTouch} style={{left:bench.x/mapWidth*100+'%',top:(bench.y-3)/mapHeight*100+'%',width:bench.w/mapWidth*100+'%',height:(bench.h+6)/mapHeight*100+'%'}} disabled={Boolean(panel||tutorial)} aria-label={'Sentarse en el banco '+(index+1)} title="Caminar hasta el banco y sentarse" onClick={()=>walkToEntrance({...bench.approach,benchId:bench.id})}/>)}
        {sofiaActive && <button type="button" className={styles.sofiaNpc} disabled={Boolean(panel||tutorial)} style={{left:268/mapWidth*100+'%',top:(80-34)/mapHeight*100+'%',width:24/mapWidth*100+'%'}} aria-label="Hablar con Sofía sobre su examen" onClick={()=>{clearWalking();setPanel('sofia');}}><CharacterPortrait character={SOFIA} label="Sofía"/><span>Sofía · !</span></button>}
        {inClass && game.canPresent && <>
          <button type="button" className={styles.benchTouch} style={{left:TEACHER_SEAT.x/mapWidth*100+'%',top:TEACHER_SEAT.y/mapHeight*100+'%',width:TEACHER_SEAT.w/mapWidth*100+'%',height:TEACHER_SEAT.h/mapHeight*100+'%'}} disabled={Boolean(panel||tutorial)} aria-label="Sentarme en el escritorio docente" onClick={()=>walkToEntrance({...TEACHER_SEAT.approach,benchId:TEACHER_SEAT.id})}/>
          <button type="button" className={styles.benchTouch} style={{left:TEACHER_SEAT.notebook.x/mapWidth*100+'%',top:TEACHER_SEAT.notebook.y/mapHeight*100+'%',width:TEACHER_SEAT.notebook.w/mapWidth*100+'%',height:TEACHER_SEAT.notebook.h/mapHeight*100+'%'}} disabled={Boolean(panel||tutorial)} aria-label="Notebook docente: abrir computadora" onClick={()=>walkToEntrance({...TEACHER_SEAT.approach,benchId:TEACHER_SEAT.id,notebook:true})}/>
        </>}
        {inClass && character && CLASSROOM_SEATS.map((seat,index)=><span key={seat.id}>
          <button type="button" className={styles.benchTouch} style={{left:seat.x/mapWidth*100+'%',top:seat.y/mapHeight*100+'%',width:seat.w/mapWidth*100+'%',height:seat.h/mapHeight*100+'%'}} disabled={Boolean(panel||tutorial)} aria-label={'Sentarse en la silla '+(index+1)} onClick={()=>walkToEntrance({...seat.approach,benchId:seat.id})}/>
          <button type="button" className={styles.benchTouch} style={{left:seat.notebook.x/mapWidth*100+'%',top:seat.notebook.y/mapHeight*100+'%',width:seat.notebook.w/mapWidth*100+'%',height:seat.notebook.h/mapHeight*100+'%'}} disabled={Boolean(panel||tutorial)||!selectedClass||!isOpen(selectedClass.id)} aria-label={'Usar notebook '+(index+1)+': actividades de la clase'} aria-haspopup="dialog" onClick={()=>walkToEntrance({...seat.approach,benchId:seat.id,notebook:true})}/>
        </span>)}
        {inside && !inClass && game.places.slice(wing*ROOMS_PER_WING,(wing+1)*ROOMS_PER_WING).map((place,index) => {
          const door=roomDoor(index);
          return <button key={place.id} type="button" className={styles.roomDoor} style={{left:126/mapWidth*100+'%',top:door.y/mapHeight*100+'%'}} disabled={!isOpen(place.id)} title={isOpen(place.id) ? "Caminar hasta el aula" : openingLabel(place.id,place.date)} onClick={()=>{if(isOpen(place.id)) walkToEntrance(roomTarget(index));}} aria-label={`Entrar al aula ${wing*8+index+1}: ${place.title}`}>Aula {wing*8+index+1}{!isOpen(place.id) && <span> · Cerrada</span>}</button>;
        })}
        {inside && !inClass && <div className={styles.receptionist} style={{left:140/mapWidth*100+'%',top:853/mapHeight*100+'%',width:22/mapWidth*100+'%'}}><CharacterPortrait character={RECEPTIONIST} label="Empleada de recepción"/></div>}
        {inside && !inClass && <button type="button" className={styles.roomDoor} style={{left:INTRODUCTION_DOOR.x/mapWidth*100+'%',top:INTRODUCTION_DOOR.y/mapHeight*100+'%'}} onClick={()=>walkToEntrance(INTRODUCTION_DOOR)} aria-label="Consultar en recepción">Recepción</button>}
        {inside && !inClass && <button type="button" className={styles.roomDoor} style={{left:REAR_EXIT.x/mapWidth*100+'%',top:REAR_EXIT.y/mapHeight*100+'%'}} aria-label="Salir por detrás del Nodo" onClick={()=>walkToEntrance(REAR_EXIT)}>Salida trasera</button>}
        {character && !tutorial && <button ref={companionButton} hidden type="button" className={styles.companionTouch} style={{width:32/mapWidth*100+'%',height:28/mapHeight*100+'%'}} aria-label="Hablar con tu perro robot" aria-haspopup="dialog" title="Hablar con tu perro robot"
          onPointerDown={event=>{if(event.isPrimary&&event.button===0) companionTap.current={x:event.clientX,y:event.clientY,id:event.pointerId};}}
          onPointerMove={event=>{const start=companionTap.current;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>8) companionTap.current=null;}}
          onPointerCancel={()=>{companionTap.current=null;}}
          onPointerUp={event=>{const start=companionTap.current;companionTap.current=null;if(start&&start.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<=8){clearWalking();setPanel('companion');}}}
          onClick={event=>{if(event.detail===0){clearWalking();setPanel('companion');}}}><span aria-hidden="true">?</span></button>}
      </div>
    </div>
    {seatedBench && <button type="button" className={styles.standUp} disabled={Boolean(panel||tutorial)} onClick={()=>walkToEntrance({...cameraPosition.current!})}>Levantarse</button>}
    <nav className={styles.zoomControls} aria-label="Zoom del mapa">
      <button type="button" aria-label="Alejar mapa" disabled={zoom <= .5 || Boolean(panel || tutorial)} onClick={() => changeZoom(zoom-.25)}>−</button>
      <button type="button" aria-label="Restablecer zoom" title="Restablecer zoom" disabled={Boolean(panel || tutorial)} onClick={() => changeZoom(1)}>{Math.round(zoom*100)}%</button>
      <button type="button" aria-label="Acercar mapa" disabled={zoom >= 2 || Boolean(panel || tutorial)} onClick={() => changeZoom(zoom+.25)}>+</button>
    </nav>
    <header className={styles.hud}>{game.canPresent && <span className={styles.teacherBadge}>Carlos · Docente</span>}
      <button type="button" ref={menuButton} className={styles.menuTrigger} aria-haspopup="dialog" aria-expanded={panel !== null} onClick={() => setPanel('menu')}><span aria-hidden="true">☰</span> Menú</button>
    </header>
    <aside className={styles.compass} role="img" aria-label={inside ? "Orientación: este arriba, oeste abajo, norte a la izquierda y sur a la derecha" : "Orientación: sur arriba, norte abajo, este a la izquierda y oeste a la derecha"}><span className={styles.compassSouth}>{inside ? 'E' : 'S'}</span><span className={styles.compassEast}>{inside ? 'N' : 'E'}</span><span className={styles.compassRose} aria-hidden="true">✦</span><span className={styles.compassWest}>{inside ? 'S' : 'O'}</span><span className={styles.compassNorth}>{inside ? 'O' : 'N'}</span></aside>
    <aside className={styles.serverClock} aria-label="Hora del servidor en Argentina">
      <time dateTime={clock ? new Date(clock.now).toISOString() : undefined}>{clock ? argentinaDateTime(clock.now) : 'Sincronizando…'}</time>
      {clock && !clock.fresh && <small>Sin conexión · accesos bloqueados</small>}
    </aside>
    {inside && <nav className={styles.interiorNav} aria-label="Navegación del edificio"><button type="button" onClick={()=>inClass ? leaveClass() : exitNodo()}>{inClass ? '← Volver al pasillo' : '← Salir al jardín'}</button>{!inClass && game.places.length>8 && <><button type="button" disabled={wing===0} onClick={()=>{clearWalking();setNearRoom(null);setWing(wing-1);}}>← Ala anterior</button><span>Ala {wing+1}</span><button type="button" disabled={(wing+1)*8>=game.places.length} onClick={()=>{clearWalking();setNearRoom(null);setWing(wing+1);}}>Ala siguiente →</button></>}</nav>}
    {panel === 'reception' && <CompanionChat courseTitle={game.courseTitle} places={game.places} fresh={Boolean(clock?.fresh)} inside={inside} inClass={inClass} onClose={()=>setPanel(null)} conversation={{name:'Recepción',subtitle:'Información del curso',intro:'¡Bienvenidos al Nodo! Soy la asistente de recepción. Acá podés consultar los aspectos generales del curso. ¿En qué te ayudo?',portrait:<CharacterPortrait character={RECEPTIONIST} label="Empleada de recepción"/>,questions:Object.keys(RECEPTION_ANSWERS),answer:q=>RECEPTION_ANSWERS[q as keyof typeof RECEPTION_ANSWERS]}}/>}
    {panel === 'sofia' && sofiaActive && <CompanionChat courseTitle={game.courseTitle} places={game.places} fresh={Boolean(clock?.fresh)} inside={inside} inClass={inClass} onClose={()=>setPanel(null)} conversation={{name:'Sofía',intro:'¡Hola! Tengo seis días para preparar seis temas. La IA me dijo: «Estudiá un tema por día». Parece ordenado… ¿Me ayudás a ver si sirve para mi situación?',portrait:<CharacterPortrait character={SOFIA} label="Sofía"/>,questions:Object.keys(SOFIA_QUESTIONS),answer:q=>{setSofiaProgress(p=>({...p,clues:p.clues.includes(q)?p.clues:[...p.clues,q]}));return SOFIA_QUESTIONS[q as keyof typeof SOFIA_QUESTIONS];}}}/>}
    {panel === 'companion' && <CompanionChat conversation={sofiaActive ? {name:character?.petName || 'Perro robot',intro:sofiaHint(sofiaProgress,hintLevel),questions:['Otra pista sobre Sofía','¿Dónde resuelvo la actividad?'],answer:q=>{if(q.startsWith('¿Dónde')) return 'Tocá una notebook del Aula 1. Caminaremos hasta el asiento y podrás revisar el plan. Podés volver a hablar con Sofía cuando quieras.';const next=Math.min(hintLevel+1,2);setHintLevel(next);return sofiaHint(sofiaProgress,next);}} : undefined} petName={character?.petName} courseTitle={game.courseTitle} places={game.places} fresh={Boolean(clock?.fresh)} inside={inside} inClass={inClass} onClose={()=>setPanel(null)} />}
    {panel && panel !== 'companion' && panel !== 'sofia' && panel !== 'reception' && <GamePanel wide={panel === 'presentation' || panel === 'notebook' || panel === 'classroom' || panel === 'identity'} title={(panel === 'classroom' || panel === 'notebook') && selectedClass ? (panel === 'notebook' ? 'Notebook · ' : '') + selectedClass.title : panelTitles[panel]} onClose={() => setPanel(null)} exitHref={panel === 'menu' ? PLATFORM_URL : undefined}>

      {saveSofia && <div role="status"><p>{sofiaSave.label}{sofiaSave.dirty && ' · Esperá la confirmación antes de salir.'}</p>{sofiaSave.error && <><p>{sofiaSave.error}</p><button onClick={sofiaSave.retry}>Reintentar guardado</button></>}</div>}
      {(panel === 'classroom' || panel === 'notebook') && !selectedClass && <p>Esta clase ya no está disponible. Volvé a Encuentros para consultar el calendario actualizado.</p>}
      {(panel === 'classroom' || panel === 'notebook') && selectedClass && <>{isOpen(selectedClass.id) ? <>{panel === 'notebook' ? <TeacherComputer key={selectedClass.id} classId={selectedClass.id} label="Computadora del alumno" load={readComputer} activities={sofiaClass ? <SofiaMission persistent={Boolean(saveSofia)} progress={sofiaProgress} onChange={setSofiaProgress} onTalk={()=>setPanel('sofia')} onHint={()=>setPanel('companion')}/> : <LessonBoard notebook classId={selectedClass.id} load={readBoard}/>}/> : <LessonBoard notebook key={selectedClass.id} classId={selectedClass.id} load={readBoard} />}</> : <p>{openingLabel(selectedClass.id,selectedClass.date)}. {clock?.fresh ? "El aula está cerrada." : "Esperando confirmación del servidor."}</p>}</>}
      {panel === 'presentation' && game.canPresent && selectedClass && isOpen(selectedClass.id) && <TeacherComputer classId={selectedClass.id} load={loadPresentation}/>}
      {panel === 'identity' && renderIdentity?.(() => setPanel('menu'))}
      {panel === 'menu' && <>
        <p className={styles.intro}>Un descanso en el camino. Elegí cómo continuar.</p>
        <div className={styles.menuItems}>{renderIdentity && <button type="button" onClick={() => setPanel('identity')}><span className={styles.menuIcon} aria-hidden="true">✎</span><span><strong>Mi personaje y mis datos</strong><small>Apariencia, datos personales y nombre de tu mascota</small></span><span aria-hidden="true">→</span></button>}{menuSections.map(item => <button key={item.panel} type="button" onClick={() => setPanel(item.panel)}><span className={styles.menuIcon} aria-hidden="true">{item.icon}</span><span><strong>{item.panel === 'companion' ? character?.petName || panelTitles[item.panel] : item.panel === 'encounters' ? 'Encuentros' : panelTitles[item.panel]}</strong><small>{item.description}</small></span><span aria-hidden="true">→</span></button>)}</div>
        <div className={styles.settings}><button type="button" aria-pressed={paused} onClick={() => setMotionPaused(!paused)}>{paused ? 'Activar animaciones' : 'Pausar animaciones'}</button><p>El entorno descansa mientras el menú está abierto.</p></div>
        <div className={styles.exitLinks}><Link href={game.canPresent ? `/docentes/cursos/${game.courseId}` : `/estudiantes/cursos/${game.courseId}?vista=clasica`}>Abrir aula clásica <span aria-hidden="true">↗</span></Link></div>
      </>}
      {panel === 'encounters' && <><p className={styles.intro}>Bienvenido al Nodo Tecnológico Catamarca. Elegí el encuentro al que querés entrar.</p><button type="button" className={styles.readOnBoard} onClick={()=>{clearWalking();setPanel('reception');}}>Recepción del curso · Siempre disponible</button><ol className={styles.placeList}>{game.places.map((place, index) => <li key={place.id}><span className={styles.index}>{String(index + 1).padStart(2, '0')}</span><div><h3>{place.title}</h3><p>Nodo Tecnológico Catamarca · {openingLabel(place.id,place.date)}</p><button type="button" className={styles.readOnBoard} disabled={!isOpen(place.id)} onClick={()=>{if(!isOpen(place.id)) return; clearWalking();setClassIndex(index);setPanel('classroom');}}>Ver materiales <span className={styles.srOnly}>{place.title}</span> →</button></div></li>)}</ol>{!game.places.length && <p>Aún no hay clases publicadas.</p>}</>}
      {panel === 'missions' && <>{game.missions.length ? <><label className={styles.filter}>Mostrar <select value={missionFilter} onChange={event => setMissionFilter(event.target.value)}><option value="all">Todas</option><option value="pending">En camino</option><option value="complete">Completadas</option></select></label><div className={styles.missions}>{missions.map(mission => <article key={mission.id} className={styles.mission}><span className={styles.state}>{stateLabels[mission.state]}</span><h3>{mission.title}</h3><p>{mission.dueDate ? `Entrega: ${displayDate(mission.dueDate)}` : 'Consultá la consigna en el aula.'}</p><Link href={mission.href}>{mission.state === 'approved' || mission.state === 'rejected' ? 'Ver devolución' : mission.state === 'correction_requested' ? 'Revisar devolución y corregir' : 'Abrir misión'} →</Link></article>)}</div>{!missions.length && <p>Todavía no hay misiones en esta categoría.</p>}</> : <div className={styles.empty}><span aria-hidden="true">⚑</span><h3>Pronto habrá nuevas misiones</h3><p>Los trabajos aparecerán cuando el equipo docente los publique. Mientras tanto, podés explorar los encuentros.</p></div>}</>}
      {panel === 'journal' && <div className={styles.journal}>{sofiaProgress.clues.length>0 && <section><h3>Sofía y su examen</h3><p>{sofiaProgress.clues.length}/3 datos descubiertos · {sofiaProgress.reviewed && !sofiaFeedback(sofiaProgress).length ? 'Práctica completada' : 'En investigación'}</p>{sofiaProgress.reflection && <blockquote>{sofiaProgress.reflection}</blockquote>}<small>{saveSofia ? 'Notas personales guardadas con tu misión; no equivalen a una evaluación.' : 'Notas de esta sesión. Se reinician al recargar.'}</small></section>}<div className={styles.garden} aria-hidden="true">✿ {game.completed ? '✿' : '♧'} ♧</div><h3>Las ideas echan raíces</h3><p>Cada trabajo aprobado ayuda a que tu rincón del valle florezca.</p>{game.missions.length ? <><strong>{game.completed} de {game.missions.length} misiones completadas</strong><progress value={game.completed} max={game.missions.length} aria-label="Trabajos aprobados" /></> : <p>Tu historia está por comenzar.</p>}<p className={styles.note}>El progreso refleja las entregas y evaluaciones del aula. Abrir una clase no registra asistencia ni aprobación.</p></div>}
      {panel === 'help' && <div className={styles.help}><h3>Explorá a tu ritmo</h3><p>Entrá al Nodo Tecnológico Catamarca, recorré su pasillo y cruzá una puerta de aula. Dentro, hacé clic o tap en una notebook para acceder a las actividades y materiales. Usá la rueda del mouse sobre el mapa o los botones − y + para cambiar el zoom; tocá el porcentaje para restablecerlo. En pantallas táctiles o en el touchpad de la notebook, separá o juntá dos dedos para acercar o alejar. El zoom se acerca al punto que elegís. Al volver a caminar, la cámara sigue suavemente al personaje. En pantallas pequeñas, deslizá el mapa para llegar a todos los lugares. Hacé clic o tap en un punto libre del suelo para caminar hasta allí. El personaje rodea los obstáculos; otro clic cambia el destino. Las flechas del teclado o WASD cancelan el recorrido. Arrastrar el mapa no inicia una caminata. Cruzá el acceso central para entrar al edificio; cerca de una puerta de aula podés presionar E. Para volver al jardín, caminá hacia la salida principal, al norte (abajo), o usá Salir al jardín. La salida trasera queda al sur (arriba), hacia la plaza. La brújula indica también este a la izquierda y oeste a la derecha.</p><h3>Todo a mano</h3><p>Dentro del menú, Encuentros ofrece la lista completa de clases. Misiones reúne los trabajos; Mi diario muestra tu avance.</p><h3>Teclado y movimiento</h3><p>Usá Tab para recorrer los controles y Enter para activarlos. Escape cierra este panel. Podés pausar las animaciones desde el menú; el juego respeta tu preferencia de movimiento reducido.</p><h3>Volver cuando quieras</h3><p>Volver a Epixum te lleva a www.epixum.com. Tu personaje y el recorrido guardado se conservan. Abrir aula clásica permite usar la vista habitual del curso.</p></div>}
    </GamePanel>}
    {saveSofia && <aside className={styles.sofiaSave} role="status"><span>{sofiaSave.label}</span>{sofiaSave.error && <><p>{sofiaSave.error}</p><button onClick={sofiaSave.retry}>Reintentar guardado</button></>}</aside>}
    {tutorial && <GameTour {...tutorial} />}
  </main>;
}
