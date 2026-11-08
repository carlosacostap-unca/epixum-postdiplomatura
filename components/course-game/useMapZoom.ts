'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type MouseEvent, type RefObject } from 'react';

type ZoomAnchor = {x:number;y:number;clientX:number;clientY:number};
function readViewport(ref?:RefObject<HTMLDivElement | null>) { return ref?.current ?? null; }
function getZoomAnchor(viewport:RefObject<HTMLDivElement | null>|undefined,clientX:number,clientY:number):ZoomAnchor|undefined {
  const map=readViewport(viewport)?.firstElementChild?.getBoundingClientRect();
  if(!map?.width || !map.height) return;
  return {x:(clientX-map.left)/map.width,y:(clientY-map.top)/map.height,clientX,clientY};
}
function restoreZoomAnchor(element:HTMLDivElement,anchor:ZoomAnchor,map:DOMRect) {
  element.scrollLeft+=map.left+anchor.x*map.width-anchor.clientX;
  element.scrollTop+=map.top+anchor.y*map.height-anchor.clientY;
}

export function useMapZoom(stopWalking: () => void, viewport?: RefObject<HTMLDivElement | null>, disabled = false) {
  const [zoom, setZoom] = useState(1);
  const value = useRef(1);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number; anchor?:ZoomAnchor } | null>(null);
  const pendingAnchor = useRef<ZoomAnchor | null>(null);
  const consumed = useRef(false);
  const origins = useRef(new Map<number, {x:number;y:number}>());
  useEffect(() => {
    const reset = () => { touches.current.clear(); origins.current.clear(); pinch.current=null; };
    window.addEventListener('blur',reset);
    return () => window.removeEventListener('blur',reset);
  }, []);
  const anchorAt = useCallback((clientX:number,clientY:number)=>getZoomAnchor(viewport,clientX,clientY),[viewport]);
  const changeZoom = useCallback((next: number, anchor?:ZoomAnchor) => {
    stopWalking();
    const rect=readViewport(viewport)?.getBoundingClientRect();
    pendingAnchor.current=anchor ?? (rect ? anchorAt(rect.left+rect.width/2,rect.top+rect.height/2) : undefined) ?? null;
    value.current = Math.max(.5, Math.min(2, next));
    setZoom(value.current);
  }, [stopWalking,viewport,anchorAt]);
  useLayoutEffect(()=>{
    const element=viewport?.current, anchor=pendingAnchor.current;
    const map=element?.firstElementChild?.getBoundingClientRect();
    if(element && map && anchor) {
      restoreZoomAnchor(element,anchor,map);
    }
    pendingAnchor.current=null;
  },[zoom,viewport]);
  useEffect(() => {
    const element = viewport?.current;
    if (!element || disabled) return;
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY || event.ctrlKey || event.metaKey || touches.current.size) return;
      // A non-passive listener prevents scrolling the camera while zooming.
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      changeZoom(value.current * Math.exp(-Math.max(-200, Math.min(200, pixels)) * .002),anchorAt(event.clientX,event.clientY));
    };
    element.addEventListener('wheel', wheel, {passive:false});
    return () => element.removeEventListener('wheel', wheel);
  }, [viewport, disabled, changeZoom,anchorAt]);
  const distance = () => {
    const [a, b] = [...touches.current.values()];
    return a && b ? Math.hypot(a.x-b.x, a.y-b.y) : 0;
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    touches.current.delete(event.pointerId);
    origins.current.delete(event.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    if (consumed.current && event.pointerType === 'touch') event.stopPropagation();
  };
  return { zoom, changeZoom, handlers: {
    onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (!touches.current.size) consumed.current = false;
      if (event.pointerType !== 'touch') return;
      touches.current.set(event.pointerId, {x:event.clientX,y:event.clientY});
      origins.current.set(event.pointerId, {x:event.clientX,y:event.clientY});
      if (touches.current.size >= 2) {
        consumed.current = true;
        stopWalking();
        const [a,b]=[...touches.current.values()];
        pinch.current = {distance:Math.max(1,distance()),zoom:value.current,anchor:anchorAt((a.x+b.x)/2,(a.y+b.y)/2)};
        event.stopPropagation();
      }
    },
    onPointerMoveCapture: (event: PointerEvent<HTMLDivElement>) => {
      const previous = touches.current.get(event.pointerId);
      if (!previous) return;
      const origin = origins.current.get(event.pointerId)!;
      if (Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>8) {
        consumed.current=true;
        stopWalking();
      }
      touches.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if (pinch.current) {
        const [a,b]=[...touches.current.values()];
        const anchor=pinch.current.anchor;
        changeZoom(pinch.current.zoom * distance() / pinch.current.distance,anchor?{...anchor,clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2}:undefined);
        event.stopPropagation();
      } else {
        event.currentTarget.scrollLeft -= event.clientX-previous.x;
        event.currentTarget.scrollTop -= event.clientY-previous.y;
      }
    },
    onPointerUpCapture: finish,
    onPointerCancelCapture: finish,
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (consumed.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    },
  }};
}
