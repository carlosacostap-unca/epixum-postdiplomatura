/** A single animation follows a changing target, including after walking stops. */
export function createCameraFollow() {
  let frame: number | null = null;
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let viewport: HTMLElement | null = null;
  let previous = 0;
  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    viewport = null;
  };
  const tick = (time: number) => {
    frame = null;
    if (!viewport) return;
    const weight = 1 - Math.exp(-Math.min(50, Math.max(0, time - previous)) / 150);
    previous = time;
    const dx = target.x - current.x, dy = target.y - current.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      viewport.scrollLeft = target.x; viewport.scrollTop = target.y;
      viewport = null;
      return;
    }
    current.x += dx * weight; current.y += dy * weight;
    viewport.scrollLeft = current.x;
    viewport.scrollTop = current.y;
    frame = requestAnimationFrame(tick);
  };
  return {
    stop,
    moveTo(element: HTMLElement, x: number, y: number, immediate = false) {
      if (immediate) { stop(); element.scrollLeft = x; element.scrollTop = y; return; }
      viewport = element;
      target = { x, y };
      if (frame === null) {
        current = { x: element.scrollLeft, y: element.scrollTop };
        previous = performance.now(); frame = requestAnimationFrame(tick);
      }
    },
  };
}
