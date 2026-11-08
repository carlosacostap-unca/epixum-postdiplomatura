import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CourseMissionMap from './CourseMissionMap';
import type { VillageState } from './phaser/village-engine';
import { INTRODUCTION_DOOR } from '@/lib/course-game/interior';
import { DEFAULT_CHARACTER } from '@/lib/course-game/onboarding';
const engine=vi.hoisted(()=>({current:null as VillageState|null}));
vi.mock('./PhaserVillage',()=>({default:(props:VillageState)=>{engine.current=props;return <div/>;}}));
describe('aulas según horario',()=>{
  it('actualiza títulos y orden sin cambiar la clase seleccionada, y retira clases eliminadas',async()=>{
    vi.useFakeTimers({toFake:['setInterval','clearInterval','performance']});
    try {
      const a={id:'a',title:'Primera',date:'2020-01-01T12:00:00Z'},b={id:'b',title:'Segunda',date:'2020-02-01T12:00:00Z'};
      const sync=vi.fn().mockResolvedValue({serverNow:Date.now(),classes:[a,b]});
      const load=vi.fn(async(id:string)=>({success:true as const,content:{title:id,description:`<p>Contenido ${id}</p>`,resources:[]}}));
      const view=render(<CourseMissionMap syncSchedule={sync} loadBoard={load} game={{courseId:'pilot',courseTitle:'Curso',title:'Valle',introduction:'',missions:[],completed:0,places:[]}}/>);
      await act(async()=>{});
      fireEvent.click(screen.getByRole('button',{name:/Menú/}));
      fireEvent.click(screen.getByRole('button',{name:/Encuentros/}));
      fireEvent.click(screen.getByRole('button',{name:/Leer en la pizarra Primera/}));
      await act(async()=>{});
      sync.mockResolvedValue({serverNow:Date.now(),classes:[b,{...a,title:'Primera actualizada'}]});
      await act(async()=>vi.advanceTimersByTimeAsync(15000));
      expect(screen.getByRole('dialog',{name:'Primera actualizada'})).toBeVisible();
      expect(screen.getByText('Contenido a')).toBeVisible();
      expect(load).toHaveBeenCalledTimes(1);
      sync.mockResolvedValue({serverNow:Date.now(),classes:[b]});
      await act(async()=>vi.advanceTimersByTimeAsync(15000));
      expect(screen.queryByText('Contenido a')).not.toBeInTheDocument();
      expect(screen.getByText(/Esta clase ya no está disponible/)).toBeVisible();
      view.unmount();
    } finally { vi.useRealTimers(); }
  });
  it('bloquea puertas, interacción E y lectura en lista antes de la hora del servidor',async()=>{
    const classes=[{id:'past',date:'2026-11-01T23:00:00Z'},{id:'future',date:'2026-11-10T23:00:00Z'}];
    const sync=vi.fn().mockResolvedValue({serverNow:Date.parse('2026-11-08T15:00:00Z'),classes});
    const load=vi.fn();
    render(<CourseMissionMap syncSchedule={sync} character={DEFAULT_CHARACTER} loadBoard={load} game={{courseId:'pilot',courseTitle:'Curso',title:'Valle',introduction:'',missions:[],completed:0,places:classes.map((c,i)=>({...c,name:'Nodo',title:`Clase ${i+1}`,href:'#'}))}}/>);
    await waitFor(()=>expect(engine.current?.openRooms).toEqual([true,false]));
    expect(screen.getByLabelText('Hora del servidor en Argentina')).toHaveTextContent('12:00:00');
    act(()=>engine.current?.onEnter?.());
    expect(screen.getByRole('button',{name:'Entrar al aula 2: Clase 2'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Entrar al aula 1: Clase 1'})).toBeEnabled();
    act(()=>{engine.current?.onRoom?.(1);engine.current?.onPosition?.({x:180,y:155});});
    fireEvent.keyDown(screen.getByLabelText('Interior del Nodo'),{key:'e'});
    expect(screen.queryByLabelText('Interior del aula')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/Menú/}));
      fireEvent.click(screen.getByRole('button',{name:/Encuentros/}));
    expect(screen.getByRole('button',{name:/Leer en la pizarra Clase 2/})).toBeDisabled();
    expect(load).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Cerrar y volver al juego'}));
    fireEvent.click(screen.getByRole('button',{name:'Entrar al Aula 0: Bienvenida al curso'}));
    expect(engine.current?.destination?.()).toEqual(INTRODUCTION_DOOR);
    act(()=>engine.current?.onRoom?.(-1));
    expect(screen.getByLabelText('Interior del aula')).toBeVisible();
    act(()=>engine.current?.onPosition?.({x:240,y:120}));
    fireEvent.click(screen.getByRole('button',{name:'Ver pizarra · E'}));
    expect(await screen.findByText('Una forma de aprender')).toBeVisible();
    expect(load).not.toHaveBeenCalled();
  });
  it('el Aula 0 permanece abierta sin sincronización del calendario',()=>{
    render(<CourseMissionMap character={DEFAULT_CHARACTER} game={{courseId:'pilot',courseTitle:'Curso',title:'Valle',introduction:'',missions:[],completed:0,places:[]}}/>);
    act(()=>engine.current?.onEnter?.());
    expect(screen.getByRole('button',{name:'Entrar al Aula 0: Bienvenida al curso'})).toBeEnabled();
    act(()=>engine.current?.onRoom?.(-1));
    expect(screen.getByLabelText('Interior del aula')).toBeVisible();
  });
});
