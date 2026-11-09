import { expect,it,vi,beforeEach } from 'vitest';
import type PocketBase from 'pocketbase';
import { readSofiaProgress,saveSofiaProgress } from './sofia-service';
import { INITIAL_SOFIA,SOFIA_QUESTIONS } from './sofia';
const access=vi.hoisted(()=>vi.fn());
vi.mock('./service',()=>({authorizeCourseGame:access}));
beforeEach(()=>access.mockResolvedValue({user:{id:'student-self'}}));
function fixture(){let data:unknown=null;const getList=vi.fn(async()=>({items:[{id:'own-row',sofiaProgress:data}]}));const update=vi.fn(async(_id:string,value:{sofiaProgress:unknown})=>{data=value.sofiaProgress;});const service={filter:(query:string,params:unknown)=>JSON.stringify({query,params}),collection:()=>({getList,update})} as unknown as PocketBase;return {service,getList,update};}
it('recupera respuestas, pistas y notas tras volver a entrar sin tocar el perfil',async()=>{
 const f=fixture(),pb={} as PocketBase;
 expect(await readSofiaProgress(pb,f.service,'course')).toEqual(INITIAL_SOFIA);
 const next={...INITIAL_SOFIA,clues:Object.keys(SOFIA_QUESTIONS),reflection:'Mi recomendación personal para Sofía',available:'6',needed:'12',hintLevel:2};
 await saveSofiaProgress(pb,f.service,'course',next);
 expect(await readSofiaProgress(pb,f.service,'course')).toEqual(next);
 expect(f.update).toHaveBeenCalledWith('own-row',{sofiaProgress:next});
 expect(f.getList.mock.calls[0]).toBeDefined();
});
it('rechaza sesiones ajenas, campos de identidad y fallos de lectura',async()=>{
 const f=fixture(),pb={} as PocketBase;
 access.mockResolvedValueOnce(null);
 await expect(saveSofiaProgress(pb,f.service,'course',INITIAL_SOFIA)).rejects.toThrow('Acceso');
 expect(f.update).not.toHaveBeenCalled();
 await expect(saveSofiaProgress(pb,f.service,'course',{...INITIAL_SOFIA,student:'other'})).rejects.toThrow();
 f.getList.mockRejectedValueOnce(new Error('Sin conexión'));
 await expect(readSofiaProgress(pb,f.service,'course')).rejects.toThrow('Sin conexión');
});
