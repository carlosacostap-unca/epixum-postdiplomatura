import { act,renderHook } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { useSofiaSave } from './useSofiaSave';
import { INITIAL_SOFIA,type SaveSofia } from '@/lib/course-game/sofia';
afterEach(()=>vi.useRealTimers());
it('no reescribe al cargar y serializa las respuestas que cambian durante un guardado',async()=>{
 vi.useFakeTimers();let finish!:(value:{success:true})=>void;
 const save=vi.fn<SaveSofia>().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({success:true});
 const {result,rerender}=renderHook(({p})=>useSofiaSave(p,save),{initialProps:{p:INITIAL_SOFIA}});
 await act(()=>vi.advanceTimersByTimeAsync(500));expect(save).not.toHaveBeenCalled();
 rerender({p:{...INITIAL_SOFIA,reflection:'Primera idea'}});
 await act(()=>vi.advanceTimersByTimeAsync(500));
 rerender({p:{...INITIAL_SOFIA,reflection:'Recomendación corregida'}});
 expect(save).toHaveBeenCalledTimes(1);
 await act(async()=>finish({success:true}));
 expect(result.current.dirty).toBe(true);
 await act(()=>vi.advanceTimersByTimeAsync(500));
 expect(save).toHaveBeenLastCalledWith({...INITIAL_SOFIA,reflection:'Recomendación corregida'});
 expect(result.current.dirty).toBe(false);
});
it('mantiene pendiente un fallo y permite reintentar el mismo borrador',async()=>{
 vi.useFakeTimers();const save=vi.fn<SaveSofia>().mockResolvedValueOnce({success:false,error:'Sin conexión'}).mockResolvedValue({success:true});
 const {result,rerender}=renderHook(({p})=>useSofiaSave(p,save),{initialProps:{p:INITIAL_SOFIA}});
 rerender({p:{...INITIAL_SOFIA,available:'6'}});
 await act(()=>vi.advanceTimersByTimeAsync(500));
 expect(result.current.error).toBe('Sin conexión');expect(result.current.dirty).toBe(true);
 const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);
 act(()=>result.current.retry());await act(()=>vi.advanceTimersByTimeAsync(500));expect(result.current.dirty).toBe(false);
});
