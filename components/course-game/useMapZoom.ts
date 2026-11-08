'use client';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type MouseEvent, type RefObject } from 'react';

export function useMapZoom(stopWalking: () => void, viewport?: RefObject<HTMLDivElement | null>, disabled = false) {
  const [zoom, setZoom] = useState(1);
  const value = useRef(1);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const consumed = useRef(false);
  const origins = useRef(new Map<number, {x:number;y:number}>());
  useEffect(() => {
    const reset = () => { touches.current.clear(); origins.current.clear(); pinch.current=null; };
    window.addEventListener('blur',reset);
    return () => window.removeEventListener('blur',reset);
  }, []);
  const changeZoom = useCallback((next: number) => {
    stopWalking();
    value.current = Math.max(.5, Math.min(2, next));
    setZoom(value.current);
  }, [stopWalking]);
  useEffect(() => {
    const element = viewport?.current;
    if (!element || disabled) return;
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY || event.ctrlKey || event.metaKey || touches.current.size) return;
      // A non-passive listener prevents scrolling the camera while zooming.
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      changeZoom(value.current * Math.exp(-Math.max(-200, Math.min(200, pixels)) * .002));
    };
    element.addEventListener('wheel', wheel, {passive:false});
    return () => element.removeEventListener('wheel', wheel);
  }, [viewport, disabled, changeZoom]);
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
        pinch.current = {distance:Math.max(1,distance()),zoom:value.current};
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
        changeZoom(pinch.current.zoom * distance() / pinch.current.distance);
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
