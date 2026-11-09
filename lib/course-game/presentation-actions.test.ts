import { expect,it,vi } from 'vitest';
const auth=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/pocketbase-server',()=>({createServerClient:async()=>({})}));
vi.mock('./service',()=>({authorizeCourseGame:auth}));
import { loadPresentationAction } from './presentation-actions';
it('solo entrega la diapositiva al presentador autorizado de la clase habilitada',async()=>{
 auth.mockResolvedValue({canPresent:false,config:{enabledClassIds:['one']}});
 expect((await loadPresentationAction('course','one')).success).toBe(false);
 auth.mockResolvedValue({canPresent:true,config:{enabledClassIds:['one']}});
 expect((await loadPresentationAction('course','other')).success).toBe(false);
 expect(await loadPresentationAction('course','one')).toMatchObject({success:true,content:{title:'Bienvenidos',resources:[]}});
});
