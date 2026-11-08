import { expect,it } from 'vitest';
import { canopyOpacity } from './canopy';
it('aclara la copa si tapa al personaje o a la mascota y la restaura al salir',()=>{
 const crown={x:100,y:100,w:25,h:20},far={x:0,y:0,w:20,h:34},behind={x:110,y:90,w:20,h:34};
 expect(canopyOpacity(crown,[far])).toBe(1);
 expect(canopyOpacity(crown,[behind,far])).toBe(.4);
 expect(canopyOpacity(crown,[far,behind])).toBe(.4);
 expect(canopyOpacity(crown,[])).toBe(1);
});
