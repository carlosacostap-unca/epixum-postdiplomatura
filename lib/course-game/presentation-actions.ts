'use server';
import { createServerClient } from '@/lib/pocketbase-server';
import { authorizeCourseGame } from './service';
import { readBoardContent } from './board-service';
import { safeResourceUrl, type BoardResult } from './board';
export async function loadPresentationAction(courseId:string,classId:string):Promise<BoardResult> {
 try {
  const pb=await createServerClient();
  const access=await authorizeCourseGame(pb,courseId);
  if(!access?.canPresent || !access.config.enabledClassIds?.includes(classId))throw new Error('Acceso no autorizado');
  const lesson=await readBoardContent(pb,courseId,classId);
  const links=lesson.resources.filter(r=>safeResourceUrl(r.url));
  const recording=links.find(r=>/grabaci[oó]n/i.test(r.title));
  const live=links.find(r=>r!==recording && /en vivo|google meet/i.test(r.title));
  return {success:true,content:{title:'Clase 1',description:'',resources:[
   ...(live?[{...live,id:'live',title:'Clase en vivo'}]:[]),
   ...(recording?[{...recording,id:'recording',title:'Grabación'}]:[]),
   {id:'slides',title:'Diapositivas',url:'https://google.com',file:false,filename:''},
  ]}};
 }catch{return {success:false,error:'No pudimos abrir la computadora. Solo el docente a cargo puede usar esta notebook.'};}
}
