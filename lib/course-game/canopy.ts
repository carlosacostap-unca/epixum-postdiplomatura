export interface CanopyBounds { x:number;y:number;w:number;h:number }
export function canopyOpacity(bounds:CanopyBounds,actors:CanopyBounds[]) {
  return actors.some(a=>a.x<bounds.x+bounds.w && a.x+a.w>bounds.x && a.y<bounds.y+bounds.h && a.y+a.h>bounds.y) ? .4 : 1;
}
