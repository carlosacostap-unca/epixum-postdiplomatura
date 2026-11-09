'use server';
import { createServerClient } from '@/lib/pocketbase-server';
import { authorizeCourseGame } from './service';
import { readBoardContent } from './board-service';
import type { BoardResult } from './board';
import { computerContent } from './computer';
export async function loadPresentationAction(courseId:string,classId:string):Promise<BoardResult> {
 try {
  const pb=await createServerClient();
  const access=await authorizeCourseGame(pb,courseId);
  if(!access?.canPresent || !access.config.enabledClassIds?.includes(classId))throw new Error('Acceso no autorizado');
  const lesson=await readBoardContent(pb,courseId,classId);
  return {success:true,content:computerContent(lesson)};
 }catch{return {success:false,error:'No pudimos abrir la computadora. Solo el docente a cargo puede usar esta notebook.'};}
}
