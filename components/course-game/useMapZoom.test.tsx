import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useMapZoom } from './useMapZoom';
import { useRef } from 'react';

it.each(['wheel','pinch'])('conserva el punto del mundo bajo el foco del gesto %s',gesture=>{
  function Map() {
    const ref=useRef<HTMLDivElement>(null);
    const {zoom,handlers}=useMapZoom(()=>{},ref);
    return <div ref={ref} data-testid="viewport" {...handlers}><div data-testid="world" data-zoom={zoom}/></div>;
  }
  render(<Map/>);
  const viewport=screen.getByTestId('viewport'),world=screen.getByTestId('world');
  viewport.scrollLeft=100;viewport.scrollTop=50;
  vi.spyOn(viewport,'getBoundingClientRect').mockImplementation(()=>({left:0,top:0,width:400,height:300} as DOMRect));
  vi.spyOn(world,'getBoundingClientRect').mockImplementation(()=>({left:-viewport.scrollLeft,top:-viewport.scrollTop,width:1000*Number(world.dataset.zoom),height:1000*Number(world.dataset.zoom)} as DOMRect));
  if(gesture==='wheel') {
    fireEvent.wheel(viewport,{deltaY:-100,clientX:300,clientY:100});
    const rect=world.getBoundingClientRect();
    expect(rect.left+rect.width*.4).toBeCloseTo(300);
    expect(rect.top+rect.height*.15).toBeCloseTo(100);
  } else {
    const pointer=(type:string,id:number,x:number)=>{
      const event=new Event(type,{bubbles:true});Object.assign(event,{pointerType:'touch',pointerId:id,clientX:x,clientY:100});fireEvent(viewport,event);
    };
    pointer('pointerdown',1,100);pointer('pointerdown',2,300);pointer('pointermove',1,50);
    const rect=world.getBoundingClientRect();
    expect(rect.left+rect.width*.3).toBeCloseTo(175);
    expect(rect.top+rect.height*.15).toBeCloseTo(100);
    expect(Number(world.dataset.zoom)).toBeCloseTo(1.25);
  }
});

it('acerca y aleja con la rueda sin desplazar el mapa, respeta límites y se desactiva en paneles', () => {
  const stop=vi.fn();
  function Map({disabled=false}:{disabled?:boolean}) {
    const ref=useRef<HTMLDivElement>(null);
    const {zoom}=useMapZoom(stop,ref,disabled);
    return <div ref={ref} data-testid="map"><output>{Math.round(zoom*100)}</output></div>;
  }
  const view=render(<Map/>);
  const map=screen.getByTestId('map');
  expect(fireEvent.wheel(map,{deltaY:-100})).toBe(false);
  expect(screen.getByRole('status')).toHaveTextContent('122');
  fireEvent.wheel(map,{deltaY:100});
  expect(screen.getByRole('status')).toHaveTextContent('100');
  for(let i=0;i<10;i++) fireEvent.wheel(map,{deltaY:-3,deltaMode:1});
  expect(screen.getByRole('status')).toHaveTextContent('200');
  for(let i=0;i<10;i++) fireEvent.wheel(map,{deltaY:200});
  expect(screen.getByRole('status')).toHaveTextContent('50');
  stop.mockClear();
  expect(fireEvent.wheel(map,{deltaY:-100,ctrlKey:true})).toBe(true);
  view.rerender(<Map disabled/>);
  expect(fireEvent.wheel(map,{deltaY:-100})).toBe(true);
  expect(stop).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('50');
});

it('limita el zoom, permite restablecerlo e impide activar una puerta después de pellizcar', () => {
  const stop = vi.fn(), enter = vi.fn();
  function Map() {
    const {zoom,changeZoom,handlers} = useMapZoom(stop);
    return <><div data-testid="map" {...handlers}><button onClick={enter}>Puerta</button></div>
      <output>{Math.round(zoom*100)}</output><button onClick={()=>changeZoom(zoom+1)}>Más</button>
      <button onClick={()=>changeZoom(1)}>Restablecer</button></>;
  }
  render(<Map/>);
  const map=screen.getByTestId('map');
  const pointer=(type:string,id:number,x:number)=>{
    const event=new Event(type,{bubbles:true});
    Object.assign(event,{pointerType:'touch',pointerId:id,clientX:x,clientY:100});
    fireEvent(map,event);
  };
  pointer('pointerdown',1,100);pointer('pointerdown',2,200);
  pointer('pointermove',2,250);
  expect(screen.getByRole('status')).toHaveTextContent('150');
  pointer('pointermove',2,110);
  expect(screen.getByRole('status')).toHaveTextContent('50');
  pointer('pointerup',1,100);pointer('pointerup',2,110);
  fireEvent.click(screen.getByText('Puerta'),{detail:1});expect(enter).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Más'));fireEvent.click(screen.getByText('Más'));
  expect(screen.getByRole('status')).toHaveTextContent('200');
  fireEvent.click(screen.getByText('Restablecer'));expect(screen.getByRole('status')).toHaveTextContent('100');
  pointer('pointerdown',3,100);pointer('pointerup',3,100);
  fireEvent.click(screen.getByText('Puerta'),{detail:1});expect(enter).toHaveBeenCalledOnce();
  expect(stop).toHaveBeenCalled();
});
