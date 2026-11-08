'use client';
import { useMapZoom } from './useMapZoom';
import { CompanionChat } from './CompanionChat';
import { NODO_ENTRANCE, NODO_REAR_ENTRANCE, NODO_STAIRS_WIDTH, NODO_FOOTPRINT, WORLD_WIDTH, WORLD_HEIGHT } from '@/lib/course-game/neighborhood';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { SPAWN, nodoAccessSide, emptyWalkInput, nearNodo, type Position, type WalkInput } from '@/lib/course-game/movement';
import { nearbyRoom, nearExit, roomDoor, ROOMS_PER_WING, INTRODUCTION_DOOR, INTERIOR_SPAWN, INTERIOR_FRONT_SPAWN, INTERIOR_REAR_SPAWN, REAR_EXIT, exitSide, type NodoAccess } from '@/lib/course-game/interior';
import { INTRODUCTION_ID, INTRODUCTION_TITLE, courseIntroduction } from '@/lib/course-game/introduction';
import { nearBoard, nearClassExit } from '@/lib/course-game/classroom';
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

type Panel = 'identity' | 'classroom' | 'menu' | 'encounters' | 'missions' | 'journal' | 'help' | 'companion';
const panelTitles: Record<Panel, string> = { identity:'Mi personaje y mis datos', companion:'Tu perro robot', classroom: 'Tu aula', menu: 'Menú del aula', encounters: 'Clases en el Nodo', missions: 'Misiones', journal: 'Mi diario', help: 'Cómo jugar' };
// Extend this list when adding new game sections. Phaser remains independent.
const menuSections: { panel: Exclude<Panel, 'menu' | 'classroom' | 'identity'>; icon: string; description: string }[] = [
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

export default function CourseMissionMap({ game: initialGame, character, tutorial, loadBoard, syncSchedule, renderIdentity }: { renderIdentity?: (close: () => void) => ReactNode; syncSchedule?: SyncGameSchedule; loadBoard?: LoadBoard; game: CourseGameView; character?: Character; tutorial?: GameTourProps }) {
  const { clock, isOpen: scheduledOpen } = useGameSchedule(syncSchedule);
  const game = clock ? {...initialGame, places:clock.schedule.classes.map(c=>({
    id:c.id, date:c.date, title:c.title ?? initialGame.places.find(p=>p.id===c.id)?.title ?? 'Clase',
    name:'Nodo Tecnológico Catamarca', href:`/estudiantes/cursos/${encodeURIComponent(initialGame.courseId)}/clases/${encodeURIComponent(c.id)}`,
  }))} : initialGame;
  const isOpen = (id: string) => id === INTRODUCTION_ID || scheduledOpen(id);
  const readBoard = useCallback<LoadBoard>(async id => id === INTRODUCTION_ID ? courseIntroduction(game.courseTitle) : loadBoard ? loadBoard(id) : {success:false,error:'No pudimos cargar esta clase.'}, [game.courseTitle,loadBoard]);
  const openingLabel = (id: string, date: string) => {
    const value = clock?.schedule.classes.find(c=>c.id===id)?.date ?? date;
    return Number.isFinite(Date.parse(value)) ? `Abre ${argentinaDateTime(Date.parse(value))} (Argentina)` : 'Horario por confirmar';
  };
  const [inside, setInside] = useState(false);
  const [spawn,setSpawn] = useState<Position>(SPAWN);
  const [inClass, setInClass] = useState(false);
  const mapWidth = inside ? 480 : WORLD_WIDTH, mapHeight = inside ? 320 : WORLD_HEIGHT;
  const [atBoard, setAtBoard] = useState(false);
  const [requestedWing, setWing] = useState(0);
  const wing = Math.min(requestedWing,Math.max(0,Math.ceil(game.places.length/ROOMS_PER_WING)-1));
  const [nearRoom, setNearRoom] = useState<number | null>(null);
  const [atExit, setAtExit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const classIndex = selectedId === INTRODUCTION_ID ? -1 : selectedId === null ? null : game.places.findIndex(p=>p.id===selectedId);
  const setClassIndex = (index: number) => setSelectedId(index===-1 ? INTRODUCTION_ID : game.places[index]?.id ?? null);
  const roomCount = Math.min(ROOMS_PER_WING, Math.max(0, game.places.length-wing*ROOMS_PER_WING));
  const selectedClass = selectedId === INTRODUCTION_ID ? {id:INTRODUCTION_ID,title:INTRODUCTION_TITLE,date:''} : classIndex === null || classIndex < 0 ? null : game.places[classIndex];
  const walking = useRef(emptyWalkInput());
  const companionButton = useRef<HTMLButtonElement>(null);
  const companionTap = useRef<{x:number;y:number;id:number}|null>(null);
  const onCompanionPosition = useCallback((position:Position)=>{
    const button=companionButton.current;
    if(button) {button.style.left=`${position.x/mapWidth*100}%`;button.style.top=`${(position.y-12)/mapHeight*100}%`;button.hidden=false;}
  },[mapWidth,mapHeight]);
  const destination = useRef<Position | null>(null);
  const readDestination = useCallback(() => destination.current, []);
  const tapStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const readInput = useCallback(() => walking.current, []);
  const [atEntrance, setAtEntrance] = useState(false);
  const clearWalking = useCallback(() => { Object.assign(walking.current, emptyWalkInput()); destination.current = null; }, []);
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
    cameraPosition.current = position;
    setAtEntrance(!inside && nearNodo(position));
    setNearRoom(inside && !inClass ? nearbyRoom(position,roomCount) : null);
    setAtExit(inClass ? nearClassExit(position) : inside && nearExit(position));
    setAtBoard(inClass && nearBoard(position));
    const viewport = mapViewport.current;
    const map = viewport?.firstElementChild as HTMLElement | null;
    if (!viewport || !map) return;
    const x = position.x / mapWidth * map.offsetWidth + map.offsetLeft, y = position.y / mapHeight * map.offsetHeight + map.offsetTop;
    // A centered viewport is the camera; HTML hit targets share the canvas world coordinates.
    viewport.scrollLeft = Math.max(0, Math.min(map.offsetWidth+map.offsetLeft*2-viewport.clientWidth,x-viewport.clientWidth/2));
    viewport.scrollTop = Math.max(0, Math.min(map.offsetHeight+map.offsetTop*2-viewport.clientHeight,y-viewport.clientHeight/2));
  }, [inside, inClass, roomCount, mapWidth, mapHeight]);
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
    if (cameraPosition.current) onPosition(cameraPosition.current);
  }, [onPosition]);
  const enterNodo = useCallback((side:NodoAccess='front') => { setSpawn(side==='rear' ? INTERIOR_REAR_SPAWN : INTERIOR_FRONT_SPAWN); clearWalking(); setInside(true); setWing(0); setAtEntrance(false); mapViewport.current?.focus(); }, [clearWalking]);
  const exitNodo = useCallback((side:NodoAccess='front') => { setSpawn(side==='rear' ? {x:NODO_REAR_ENTRANCE.x,y:NODO_REAR_ENTRANCE.y-30} : SPAWN); clearWalking(); setInside(false); setNearRoom(null); setAtExit(false); mapViewport.current?.focus(); }, [clearWalking]);
  const openRoom = (index: number) => { if (index !== -1 && (index < 0 || index >= roomCount || !isOpen(game.places[wing*ROOMS_PER_WING+index].id))) return; clearWalking(); setClassIndex(index === -1 ? -1 : wing*ROOMS_PER_WING+index); setInClass(true); setAtBoard(false); setAtExit(false); setNearRoom(null); mapViewport.current?.focus(); };
  const leaveClass = useCallback(() => { clearWalking(); setSpawn(INTERIOR_SPAWN); setPanel(null); setInClass(false); setAtBoard(false); setAtExit(false); mapViewport.current?.focus(); }, [clearWalking]);
  const openBoard = () => { if (!inClass || !atBoard || !selectedClass || !isOpen(selectedClass.id)) return; clearWalking(); setPanel('classroom'); };
  const walkToEntrance = (target: Position) => {
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

  return <main data-location={inside ? "interior" : "exterior"} data-tour={tutorial ? TOUR_STEPS[tutorial.step]?.target : undefined} className={styles.world} aria-label={`Aula: ${game.title}`}
    onKeyDown={event => {
      if (panel || tutorial || event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = keyDirection(event.key);
      if (direction) { event.preventDefault(); destination.current = null; walking.current[direction] = true; }
      if (event.key.toLowerCase() === 'e') { event.preventDefault(); if (inClass && atBoard) openBoard(); else if (inClass && atExit) leaveClass(); else if (inside && nearRoom !== null) openRoom(nearRoom); else if (inside && atExit) exitNodo(exitSide(cameraPosition.current ?? INTERIOR_SPAWN)); else if (atEntrance) enterNodo(nodoAccessSide(cameraPosition.current ?? SPAWN)); }
    }} onKeyUp={event => { const direction = keyDirection(event.key); if (direction) { event.preventDefault(); walking.current[direction] = false; } }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) clearWalking(); }}>
    <div ref={mapViewport} {...zoomHandlers} className={styles.viewport} aria-label={inClass ? 'Interior del aula' : inside ? 'Interior del Nodo' : 'Mapa del valle'} tabIndex={0} onPointerDown={event => { if (!(event.target as HTMLElement).closest('button')) event.currentTarget.focus(); }}>
      <div className={styles.map} style={{'--map-zoom':zoom,...(!inside ? {width:WORLD_WIDTH*2*zoom,height:WORLD_HEIGHT*2*zoom,margin:80*zoom} : {})} as CSSProperties}
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
        <PhaserVillage spawn={inClass ? undefined : spawn} key={inClass ? `class-${selectedId}` : inside ? `inside-${wing}-${game.places.map(p=>p.id).join("-")}` : 'outside'} classroom={inClass} interior={inside} onRoom={openRoom} onExit={inClass ? leaveClass : exitNodo} openRooms={game.places.slice(wing*ROOMS_PER_WING,(wing+1)*ROOMS_PER_WING).map(p=>isOpen(p.id))} onCompanionPosition={onCompanionPosition} input={readInput} destination={readDestination} movementLocked={panel !== null || Boolean(tutorial)} onPosition={onPosition} onEnter={enterNodo} character={character} selected={panel === 'encounters' ? 0 : -1} paused={paused || panel !== null} restored={game.completed > 0} count={inside ? roomCount : game.places.length} />
        {!inside && <button type="button" className={styles.nodoEntrance} style={{left:NODO_FOOTPRINT.x/mapWidth*100+'%',top:NODO_FOOTPRINT.y/mapHeight*100+'%',width:NODO_FOOTPRINT.w/mapWidth*100+'%',height:NODO_FOOTPRINT.h/mapHeight*100+'%'}} aria-label="Entrar al Nodo Tecnológico Catamarca" onClick={() => walkToEntrance(NODO_ENTRANCE)}>
        </button>}
        {!inside && <button type="button" className={styles.nodoEntrance} style={{left:(NODO_REAR_ENTRANCE.x-NODO_STAIRS_WIDTH/2)/mapWidth*100+'%',top:(NODO_REAR_ENTRANCE.y-8)/mapHeight*100+'%',width:NODO_STAIRS_WIDTH/mapWidth*100+'%',height:20/mapHeight*100+'%'}} aria-label="Entrar por detrás al Nodo Tecnológico Catamarca" onClick={() => walkToEntrance(NODO_REAR_ENTRANCE)} />}
        {inside && !inClass && game.places.slice(wing*ROOMS_PER_WING,(wing+1)*ROOMS_PER_WING).map((place,index) => {
          const door=roomDoor(index);
          return <button key={place.id} type="button" className={styles.roomDoor} style={{left:door.x/480*100+'%',top:(index<4?134:224)/320*100+'%'}} disabled={!isOpen(place.id)} title={isOpen(place.id) ? "Caminar hasta el aula" : openingLabel(place.id,place.date)} onClick={()=>{if(isOpen(place.id)) walkToEntrance({x:door.x,y:door.y+(index<4?-4:4)});}} aria-label={`Entrar al aula ${wing*8+index+1}: ${place.title}`}>Aula {wing*8+index+1}{!isOpen(place.id) && <span> · Cerrada</span>}</button>;
        })}
        {inside && !inClass && <button type="button" className={styles.roomDoor} style={{left:INTRODUCTION_DOOR.x/480*100+'%',top:INTRODUCTION_DOOR.y/320*100+'%'}} onClick={()=>walkToEntrance(INTRODUCTION_DOOR)} aria-label="Entrar al Aula 0: Bienvenida al curso">Aula 0 · Bienvenida</button>}
        {inside && !inClass && <button type="button" className={styles.roomDoor} style={{left:'50%',top:'16%'}} aria-label="Salir por detrás del Nodo" onClick={()=>walkToEntrance(REAR_EXIT)}>Salida trasera</button>}{inClass && <button type="button" className={styles.boardInteraction} disabled={!atBoard || !selectedClass || !isOpen(selectedClass.id)} onClick={openBoard} aria-haspopup="dialog">{atBoard ? 'Ver pizarra · E' : 'Acercate a la pizarra'}</button>}
        {character && !tutorial && <button ref={companionButton} hidden type="button" className={styles.companionTouch} style={{width:32/mapWidth*100+'%',height:28/mapHeight*100+'%'}} aria-label="Hablar con tu perro robot" aria-haspopup="dialog" title="Hablar con tu perro robot"
          onPointerDown={event=>{if(event.isPrimary&&event.button===0) companionTap.current={x:event.clientX,y:event.clientY,id:event.pointerId};}}
          onPointerMove={event=>{const start=companionTap.current;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>8) companionTap.current=null;}}
          onPointerCancel={()=>{companionTap.current=null;}}
          onPointerUp={event=>{const start=companionTap.current;companionTap.current=null;if(start&&start.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<=8){clearWalking();setPanel('companion');}}}
          onClick={event=>{if(event.detail===0){clearWalking();setPanel('companion');}}}><span aria-hidden="true">?</span></button>}
      </div>
    </div>
    <nav className={styles.zoomControls} aria-label="Zoom del mapa">
      <button type="button" aria-label="Alejar mapa" disabled={zoom <= .5 || Boolean(panel || tutorial)} onClick={() => changeZoom(zoom-.25)}>−</button>
      <button type="button" aria-label="Restablecer zoom" title="Restablecer zoom" disabled={Boolean(panel || tutorial)} onClick={() => changeZoom(1)}>{Math.round(zoom*100)}%</button>
      <button type="button" aria-label="Acercar mapa" disabled={zoom >= 2 || Boolean(panel || tutorial)} onClick={() => changeZoom(zoom+.25)}>+</button>
    </nav>
    <header className={styles.hud}>
      <button type="button" ref={menuButton} className={styles.menuTrigger} aria-haspopup="dialog" aria-expanded={panel !== null} onClick={() => setPanel('menu')}><span aria-hidden="true">☰</span> Menú</button>
    </header>
    <aside className={styles.compass} role="img" aria-label="Orientación: sur arriba, norte abajo, este a la izquierda y oeste a la derecha"><span className={styles.compassSouth}>S</span><span className={styles.compassEast}>E</span><span className={styles.compassRose} aria-hidden="true">✦</span><span className={styles.compassWest}>O</span><span className={styles.compassNorth}>N</span></aside>
    <aside className={styles.serverClock} aria-label="Hora del servidor en Argentina">
      <time dateTime={clock ? new Date(clock.now).toISOString() : undefined}>{clock ? argentinaDateTime(clock.now) : 'Sincronizando…'}</time>
      {clock && !clock.fresh && <small>Sin conexión · accesos bloqueados</small>}
    </aside>
    {inside && <nav className={styles.interiorNav} aria-label="Navegación del edificio"><button type="button" onClick={()=>inClass ? leaveClass() : exitNodo()}>{inClass ? '← Volver al pasillo' : '← Salir al jardín'}</button>{!inClass && game.places.length>8 && <><button type="button" disabled={wing===0} onClick={()=>{clearWalking();setNearRoom(null);setWing(wing-1);}}>← Ala anterior</button><span>Ala {wing+1}</span><button type="button" disabled={(wing+1)*8>=game.places.length} onClick={()=>{clearWalking();setNearRoom(null);setWing(wing+1);}}>Ala siguiente →</button></>}</nav>}
    {panel === 'companion' && <CompanionChat petName={character?.petName} courseTitle={game.courseTitle} places={game.places} fresh={Boolean(clock?.fresh)} inside={inside} inClass={inClass} onClose={()=>setPanel(null)} />}
    {panel && panel !== 'companion' && <GamePanel wide={panel === 'classroom' || panel === 'identity'} title={panel === 'classroom' && selectedClass ? selectedClass.title : panelTitles[panel]} onClose={() => setPanel(null)} exitHref={panel === 'menu' ? PLATFORM_URL : undefined}>

      {panel === 'classroom' && !selectedClass && <p>Esta clase ya no está disponible. Volvé a Encuentros para consultar el calendario actualizado.</p>}
      {panel === 'classroom' && selectedClass && <>{isOpen(selectedClass.id) ? <LessonBoard key={selectedClass.id} classId={selectedClass.id} load={readBoard} /> : <p>{openingLabel(selectedClass.id,selectedClass.date)}. {clock?.fresh ? "El aula está cerrada." : "Esperando confirmación del servidor."}</p>}</>}
      {panel === 'identity' && renderIdentity?.(() => setPanel('menu'))}
      {panel === 'menu' && <>
        <p className={styles.intro}>Un descanso en el camino. Elegí cómo continuar.</p>
        <div className={styles.menuItems}>{renderIdentity && <button type="button" onClick={() => setPanel('identity')}><span className={styles.menuIcon} aria-hidden="true">✎</span><span><strong>Mi personaje y mis datos</strong><small>Apariencia, datos personales y nombre de tu mascota</small></span><span aria-hidden="true">→</span></button>}{menuSections.map(item => <button key={item.panel} type="button" onClick={() => setPanel(item.panel)}><span className={styles.menuIcon} aria-hidden="true">{item.icon}</span><span><strong>{item.panel === 'companion' ? character?.petName || panelTitles[item.panel] : item.panel === 'encounters' ? 'Encuentros' : panelTitles[item.panel]}</strong><small>{item.description}</small></span><span aria-hidden="true">→</span></button>)}</div>
        <div className={styles.settings}><button type="button" aria-pressed={paused} onClick={() => setMotionPaused(!paused)}>{paused ? 'Activar animaciones' : 'Pausar animaciones'}</button><p>El entorno descansa mientras el menú está abierto.</p></div>
        <div className={styles.exitLinks}><Link href={`/estudiantes/cursos/${game.courseId}?vista=clasica`}>Abrir aula clásica <span aria-hidden="true">↗</span></Link></div>
      </>}
      {panel === 'encounters' && <><p className={styles.intro}>Bienvenido al Nodo Tecnológico Catamarca. Elegí el encuentro al que querés entrar.</p><button type="button" className={styles.readOnBoard} onClick={()=>{clearWalking();setClassIndex(-1);setPanel('classroom');}}>Aula 0 · Bienvenida al curso · Siempre abierta</button><ol className={styles.placeList}>{game.places.map((place, index) => <li key={place.id}><span className={styles.index}>{String(index + 1).padStart(2, '0')}</span><div><h3>{place.title}</h3><p>Nodo Tecnológico Catamarca · {openingLabel(place.id,place.date)}</p><button type="button" className={styles.readOnBoard} disabled={!isOpen(place.id)} onClick={()=>{if(!isOpen(place.id)) return; clearWalking();setClassIndex(index);setPanel('classroom');}}>Leer en la pizarra <span className={styles.srOnly}>{place.title}</span> →</button></div></li>)}</ol>{!game.places.length && <p>Aún no hay clases publicadas.</p>}</>}
      {panel === 'missions' && <>{game.missions.length ? <><label className={styles.filter}>Mostrar <select value={missionFilter} onChange={event => setMissionFilter(event.target.value)}><option value="all">Todas</option><option value="pending">En camino</option><option value="complete">Completadas</option></select></label><div className={styles.missions}>{missions.map(mission => <article key={mission.id} className={styles.mission}><span className={styles.state}>{stateLabels[mission.state]}</span><h3>{mission.title}</h3><p>{mission.dueDate ? `Entrega: ${displayDate(mission.dueDate)}` : 'Consultá la consigna en el aula.'}</p><Link href={mission.href}>{mission.state === 'approved' || mission.state === 'rejected' ? 'Ver devolución' : mission.state === 'correction_requested' ? 'Revisar devolución y corregir' : 'Abrir misión'} →</Link></article>)}</div>{!missions.length && <p>Todavía no hay misiones en esta categoría.</p>}</> : <div className={styles.empty}><span aria-hidden="true">⚑</span><h3>Pronto habrá nuevas misiones</h3><p>Los trabajos aparecerán cuando el equipo docente los publique. Mientras tanto, podés explorar los encuentros.</p></div>}</>}
      {panel === 'journal' && <div className={styles.journal}><div className={styles.garden} aria-hidden="true">✿ {game.completed ? '✿' : '♧'} ♧</div><h3>Las ideas echan raíces</h3><p>Cada trabajo aprobado ayuda a que tu rincón del valle florezca.</p>{game.missions.length ? <><strong>{game.completed} de {game.missions.length} misiones completadas</strong><progress value={game.completed} max={game.missions.length} aria-label="Trabajos aprobados" /></> : <p>Tu historia está por comenzar.</p>}<p className={styles.note}>El progreso refleja las entregas y evaluaciones del aula. Abrir una clase no registra asistencia ni aprobación.</p></div>}
      {panel === 'help' && <div className={styles.help}><h3>Explorá a tu ritmo</h3><p>Entrá al Nodo Tecnológico Catamarca, recorré su pasillo y cruzá una puerta de aula. Dentro, caminá hasta la pizarra y presioná E o tocá Ver pizarra para acceder al contenido. Usá la rueda del mouse sobre el mapa o los botones − y + para cambiar el zoom; tocá el porcentaje para restablecerlo. En pantallas táctiles, separá o juntá dos dedos para acercar o alejar. En pantallas pequeñas, deslizá el mapa para llegar a todos los lugares. Hacé clic o tap en un punto libre del suelo para caminar hasta allí. El personaje rodea los obstáculos; otro clic cambia el destino. Las flechas del teclado o WASD cancelan el recorrido. Arrastrar el mapa no inicia una caminata. Cruzá el acceso central para entrar al edificio; cerca de una puerta de aula podés presionar E. Para volver al jardín, caminá hacia la salida principal, al norte (abajo), o usá Salir al jardín. La salida trasera queda al sur (arriba), hacia la plaza. La brújula indica también este a la izquierda y oeste a la derecha.</p><h3>Todo a mano</h3><p>Dentro del menú, Encuentros ofrece la lista completa de clases. Misiones reúne los trabajos; Mi diario muestra tu avance.</p><h3>Teclado y movimiento</h3><p>Usá Tab para recorrer los controles y Enter para activarlos. Escape cierra este panel. Podés pausar las animaciones desde el menú; el juego respeta tu preferencia de movimiento reducido.</p><h3>Volver cuando quieras</h3><p>Volver a Epixum te lleva a www.epixum.com. Tu personaje y el recorrido guardado se conservan. Abrir aula clásica permite usar la vista habitual del curso.</p></div>}
    </GamePanel>}
    {tutorial && <GameTour {...tutorial} />}
  </main>;
}
