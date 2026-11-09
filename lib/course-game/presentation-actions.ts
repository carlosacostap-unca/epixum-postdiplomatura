'use server';
import { createServerClient } from '@/lib/pocketbase-server';
import { authorizeCourseGame } from './service';
import type { BoardResult } from './board';
export async function loadPresentationAction(courseId:string,classId:string):Promise<BoardResult> {
 try {
  const access=await authorizeCourseGame(await createServerClient(),courseId);
  if(!access?.canPresent || !access.config.enabledClassIds?.includes(classId))throw new Error('Acceso no autorizado');
  return {success:true,content:{title:'Bienvenidos',description:'Pensamiento crítico y resolución de problemas en entornos de inteligencia artificial',resources:[]}};
 }catch{return {success:false,error:'No pudimos abrir la presentación. Solo el docente a cargo puede usar esta notebook.'};}
}
