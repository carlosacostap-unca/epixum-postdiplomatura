import { expect,it,vi } from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/pocketbase-server',()=>({createServerClient:async()=>({})}));
vi.mock('./service',()=>({authorizeCourseGame:mocks.auth}));
vi.mock('./board-service',()=>({readBoardContent:mocks.read}));
import { loadPresentationAction } from './presentation-actions';
it('reserva la computadora al docente y lee los enlaces actuales de la clase',async()=>{
 mocks.auth.mockResolvedValue({canPresent:false,config:{enabledClassIds:['one']}});
 expect((await loadPresentationAction('course','one')).success).toBe(false);expect(mocks.read).not.toHaveBeenCalled();
 mocks.auth.mockResolvedValue({canPresent:true,config:{enabledClassIds:['one']}});
 expect((await loadPresentationAction('course','other')).success).toBe(false);
 mocks.read.mockResolvedValue({resources:[{id:'a',title:'Grabación de la Clase en Vivo / Grabación (YouTube)',url:'https://youtube.com/watch?v=test'},{id:'b',title:'Participar de la Clase en Vivo (Google Meet)',url:'https://meet.google.com/test'}]});
 const result=await loadPresentationAction('course','one');expect(result).toMatchObject({success:true,content:{title:'Clase 1',resources:[{id:'live',url:'https://meet.google.com/test'},{id:'recording',url:'https://youtube.com/watch?v=test'},{id:'slides',url:'https://google.com'}]}});
 expect(mocks.read).toHaveBeenCalledWith({},'course','one');
 mocks.read.mockResolvedValue({resources:[]});expect(await loadPresentationAction('course','one')).toMatchObject({success:true,content:{resources:[{id:'slides'}]}});
});
